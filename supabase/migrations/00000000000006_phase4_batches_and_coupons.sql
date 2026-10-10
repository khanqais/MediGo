-- Phase 4 Migration: Inventory batches, FEFO, and Coupons

-- 1. Create inventory_batches table
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    mfg_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(medicine_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_medicine_id ON public.inventory_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_date ON public.inventory_batches(expiry_date);

ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active batches" ON public.inventory_batches FOR SELECT USING (true);
CREATE POLICY "Staff can manage batches" ON public.inventory_batches FOR ALL USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

CREATE TRIGGER update_inventory_batches_updated_at 
BEFORE UPDATE ON public.inventory_batches 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Add batch_id to order_items
ALTER TABLE public.order_items 
ADD COLUMN batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL;

-- 3. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FLAT')),
    value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_to TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    per_user_limit INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage coupons" ON public.coupons FOR ALL USING (public.current_user_role() = 'admin');

CREATE TRIGGER update_coupons_updated_at 
BEFORE UPDATE ON public.coupons 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Create coupon_redemptions table
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10, 2) NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all redemptions" ON public.coupon_redemptions FOR SELECT USING (public.current_user_role() = 'admin');
-- Notice: Redemptions are inserted server-side by service_role, no insert policy for users.

-- 5. Add coupon_id to orders
ALTER TABLE public.orders ADD COLUMN coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;

-- 6. Replace create_order_transaction to implement FEFO and coupons
DROP FUNCTION IF EXISTS public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, JSONB);

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
BEGIN
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

    -- 2. Validate, allocate batches (FEFO), and insert order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_med_id := (v_item->>'medicine_id')::UUID;
        v_requested_qty := (v_item->>'quantity')::INTEGER;
        v_price := (v_item->>'price')::DECIMAL;
        v_remaining_qty := v_requested_qty;

        -- Verify medicine existence and active status
        SELECT name, is_active, drug_schedule 
        INTO v_med_name, v_med_active, v_med_schedule
        FROM public.medicines
        WHERE id = v_med_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Medicine not found: %', v_med_id;
        END IF;

        IF NOT v_med_active THEN
            RAISE EXCEPTION 'Medicine % is inactive', v_med_name;
        END IF;

        IF v_med_schedule = 'X' THEN
            RAISE EXCEPTION 'Schedule X narcotics cannot be ordered online: %', v_med_name;
        END IF;

        -- FEFO Allocation
        -- Lock batches ordered by expiry_date ASC
        -- Only consider batches expiring after 90 days from today
        FOR v_batch_record IN 
            SELECT id, quantity 
            FROM public.inventory_batches
            WHERE medicine_id = v_med_id 
              AND quantity > 0
              AND expiry_date >= (CURRENT_DATE + INTERVAL '90 days')
            ORDER BY expiry_date ASC
            FOR UPDATE
        LOOP
            IF v_remaining_qty = 0 THEN
                EXIT;
            END IF;

            IF v_batch_record.quantity >= v_remaining_qty THEN
                v_deduct_qty := v_remaining_qty;
            ELSE
                v_deduct_qty := v_batch_record.quantity;
            END IF;

            -- Deduct from batch
            UPDATE public.inventory_batches
            SET quantity = quantity - v_deduct_qty,
                updated_at = now()
            WHERE id = v_batch_record.id;

            -- Insert split order_item
            INSERT INTO public.order_items (
                order_id,
                medicine_id,
                batch_id,
                quantity,
                price,
                total
            ) VALUES (
                v_order_id,
                v_med_id,
                v_batch_record.id,
                v_deduct_qty,
                v_price,
                v_price * v_deduct_qty
            );

            v_remaining_qty := v_remaining_qty - v_deduct_qty;
        END LOOP;

        IF v_remaining_qty > 0 THEN
            RAISE EXCEPTION 'Insufficient stock (or batches are within 90 days of expiry) for medicine: %', v_med_name;
        END IF;

        -- Keep public.inventory in sync!
        UPDATE public.inventory
        SET stock_quantity = stock_quantity - v_requested_qty,
            updated_at = now()
        WHERE medicine_id = v_med_id;
    END LOOP;

    -- 3. Link prescription if any
    IF p_prescription_id IS NOT NULL THEN
        UPDATE public.prescriptions
        SET order_id = v_order_id
        WHERE id = p_prescription_id AND (order_id IS NULL OR order_id = v_order_id);
    END IF;

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

-- Redeclare permissions for the updated signature
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM anon;

-- 7. Replace restore_order_stock to restore back to batches
DROP FUNCTION IF EXISTS public.restore_order_stock(UUID);
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
BEGIN
    FOR v_item IN 
        SELECT medicine_id, batch_id, quantity 
        FROM public.order_items 
        WHERE order_id = p_order_id
    LOOP
        -- Restore to specific batch if known
        IF v_item.batch_id IS NOT NULL THEN
            UPDATE public.inventory_batches
            SET quantity = quantity + v_item.quantity,
                updated_at = now()
            WHERE id = v_item.batch_id;
        END IF;

        -- Keep public.inventory in sync
        UPDATE public.inventory
        SET stock_quantity = stock_quantity + v_item.quantity,
            updated_at = now()
        WHERE medicine_id = v_item.medicine_id;
    END LOOP;
    RETURN true;
END;
$$;
