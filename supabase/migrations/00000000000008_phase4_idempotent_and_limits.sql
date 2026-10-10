-- 1. Add stock_restored_at to orders for idempotency
ALTER TABLE public.orders ADD COLUMN stock_restored_at TIMESTAMP WITH TIME ZONE;

-- 2. Create app_settings table to store configurable 90-day expiry
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default 90 days
INSERT INTO public.app_settings (key, value, description)
VALUES ('inventory_expiry_buffer_days', '90'::JSONB, 'Number of days before expiry when a batch becomes unsellable')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admin can manage app_settings" ON public.app_settings FOR ALL USING (public.current_user_role() = 'admin');

-- 3. Update create_order_transaction to lock coupon and check limits, and use configurable buffer
DROP FUNCTION IF EXISTS public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB);

CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_user_id UUID,
    p_address_snapshot JSONB,
    p_subtotal DECIMAL,
    p_discount DECIMAL,
    p_delivery_fee DECIMAL,
    p_tax DECIMAL,
    p_total_amount DECIMAL,
    p_status TEXT,
    p_payment_status TEXT,
    p_payment_method TEXT,
    p_prescription_id UUID,
    p_coupon_id UUID,
    p_coupon_discount DECIMAL,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_record RECORD;
    v_item JSONB;
    v_med_id UUID;
    v_requested_qty INTEGER;
    v_price DECIMAL;
    v_med_name TEXT;
    v_med_active BOOLEAN;
    v_med_schedule TEXT;
    
    v_batch_record RECORD;
    v_remaining_qty INTEGER;
    v_deduct_qty INTEGER;
    
    v_coupon_record RECORD;
    v_global_redemptions INTEGER;
    v_user_redemptions INTEGER;
    v_expiry_buffer_days INTEGER;
BEGIN
    -- Configurable expiry buffer
    SELECT COALESCE((value->>0)::INTEGER, 90) INTO v_expiry_buffer_days
    FROM public.app_settings WHERE key = 'inventory_expiry_buffer_days';
    IF v_expiry_buffer_days IS NULL THEN
        v_expiry_buffer_days := 90;
    END IF;

    -- Validate and lock coupon if provided
    IF p_coupon_id IS NOT NULL THEN
        SELECT * INTO v_coupon_record FROM public.coupons WHERE id = p_coupon_id FOR UPDATE;
        
        IF NOT FOUND OR NOT v_coupon_record.is_active THEN
            RAISE EXCEPTION 'Coupon is not valid or inactive';
        END IF;

        IF v_coupon_record.valid_from IS NOT NULL AND v_coupon_record.valid_from > NOW() THEN
            RAISE EXCEPTION 'Coupon is not valid yet';
        END IF;

        IF v_coupon_record.valid_to IS NOT NULL AND v_coupon_record.valid_to < NOW() THEN
            RAISE EXCEPTION 'Coupon has expired';
        END IF;

        IF v_coupon_record.usage_limit IS NOT NULL THEN
            SELECT COUNT(*) INTO v_global_redemptions FROM public.coupon_redemptions WHERE coupon_id = p_coupon_id;
            IF v_global_redemptions >= v_coupon_record.usage_limit THEN
                RAISE EXCEPTION 'Coupon usage limit reached';
            END IF;
        END IF;

        IF v_coupon_record.per_user_limit IS NOT NULL THEN
            SELECT COUNT(*) INTO v_user_redemptions FROM public.coupon_redemptions WHERE coupon_id = p_coupon_id AND user_id = p_user_id;
            IF v_user_redemptions >= v_coupon_record.per_user_limit THEN
                RAISE EXCEPTION 'Per-user coupon usage limit reached';
            END IF;
        END IF;
    END IF;

    -- 1. Insert into orders table
    INSERT INTO public.orders (
        user_id,
        address_snapshot,
        subtotal,
        discount,
        delivery_fee,
        tax,
        total_amount,
        status,
        payment_status,
        payment_method,
        prescription_id,
        coupon_id
    ) VALUES (
        p_user_id,
        p_address_snapshot,
        p_subtotal,
        p_discount,
        p_delivery_fee,
        p_tax,
        p_total_amount,
        p_status,
        p_payment_status,
        p_payment_method,
        p_prescription_id,
        p_coupon_id
    )
    RETURNING id INTO v_order_id;

    -- 2. Process each item and deduct from batches (FEFO)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_med_id := (v_item->>'medicine_id')::UUID;
        v_requested_qty := (v_item->>'quantity')::INTEGER;
        v_price := (v_item->>'price')::DECIMAL;
        v_remaining_qty := v_requested_qty;

        SELECT name, is_active, drug_schedule 
        INTO v_med_name, v_med_active, v_med_schedule
        FROM public.medicines 
        WHERE id = v_med_id FOR SHARE;

        IF NOT v_med_active THEN
            RAISE EXCEPTION 'Medicine % is no longer active', v_med_name;
        END IF;
        
        IF v_med_schedule = 'X' THEN
            RAISE EXCEPTION 'Schedule X drug (%) cannot be sold online', v_med_name;
        END IF;

        -- Loop through available batches in FEFO order
        FOR v_batch_record IN 
            SELECT * FROM public.inventory_batches 
            WHERE medicine_id = v_med_id 
            AND quantity > 0
            AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
            ORDER BY expiry_date ASC
            FOR UPDATE
        LOOP
            IF v_remaining_qty <= 0 THEN
                EXIT;
            END IF;

            IF v_batch_record.quantity >= v_remaining_qty THEN
                v_deduct_qty := v_remaining_qty;
            ELSE
                v_deduct_qty := v_batch_record.quantity;
            END IF;

            -- Deduct from batch
            UPDATE public.inventory_batches 
            SET quantity = quantity - v_deduct_qty 
            WHERE id = v_batch_record.id;

            -- Insert order item specifically mapped to this batch
            INSERT INTO public.order_items (
                order_id,
                medicine_id,
                quantity,
                price,
                total,
                batch_id
            ) VALUES (
                v_order_id,
                v_med_id,
                v_deduct_qty,
                v_price,
                (v_deduct_qty * v_price),
                v_batch_record.id
            );

            v_remaining_qty := v_remaining_qty - v_deduct_qty;
        END LOOP;

        IF v_remaining_qty > 0 THEN
            RAISE EXCEPTION 'Insufficient sellable stock for medicine %', v_med_name;
        END IF;

        -- Deduct from materialized legacy inventory
        UPDATE public.inventory
        SET stock_quantity = stock_quantity - v_requested_qty
        WHERE medicine_id = v_med_id;

    END LOOP;

    -- 4. Record coupon redemption if any
    IF p_coupon_id IS NOT NULL THEN
        INSERT INTO public.coupon_redemptions (
            coupon_id,
            user_id,
            order_id,
            discount_amount
        ) VALUES (
            p_coupon_id,
            p_user_id,
            v_order_id,
            p_coupon_discount
        );
    END IF;

    -- 5. Return created order record
    SELECT * INTO v_order_record FROM public.orders WHERE id = v_order_id;
    RETURN to_jsonb(v_order_record);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM anon;

-- 4. Update restore_order_stock for idempotency
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_order RECORD;
BEGIN
    -- Check idempotency and lock order
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    IF v_order.stock_restored_at IS NOT NULL THEN
        -- Already restored, perfectly idempotent
        RETURN TRUE;
    END IF;

    FOR v_item IN 
        SELECT medicine_id, quantity, batch_id 
        FROM public.order_items 
        WHERE order_id = p_order_id
    LOOP
        IF v_item.batch_id IS NOT NULL THEN
            UPDATE public.inventory_batches
            SET quantity = quantity + v_item.quantity
            WHERE id = v_item.batch_id;
        END IF;

        UPDATE public.inventory
        SET stock_quantity = stock_quantity + v_item.quantity
        WHERE medicine_id = v_item.medicine_id;
    END LOOP;
    
    UPDATE public.orders SET stock_restored_at = NOW() WHERE id = p_order_id;

    RETURN TRUE;
END;
$$;
