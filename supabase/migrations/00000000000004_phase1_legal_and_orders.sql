-- Phase 1 Migration: Legal Safety, Data Integrity, and Atomic Orders

-- 1. Add drug_schedule to medicines (OTC, H, H1, X)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medicines' AND column_name = 'drug_schedule'
    ) THEN
        ALTER TABLE public.medicines 
        ADD COLUMN drug_schedule TEXT NOT NULL DEFAULT 'OTC' 
        CHECK (drug_schedule IN ('OTC', 'H', 'H1', 'X'));
        
        -- Backfill from prescription_required
        UPDATE public.medicines 
        SET drug_schedule = 'H' 
        WHERE prescription_required = true;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_medicines_drug_schedule ON public.medicines(drug_schedule);

-- 2. Add prescription_id to orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'prescription_id'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_prescription_id ON public.orders(prescription_id);

-- 3. Update orders.status CHECK constraint to include 'PENDING_PRESCRIPTION_APPROVAL'
DO $$
BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN (
        'PENDING', 
        'PENDING_PRESCRIPTION_APPROVAL', 
        'CONFIRMED', 
        'PROCESSING', 
        'PACKED', 
        'SHIPPED', 
        'OUT_FOR_DELIVERY', 
        'DELIVERED', 
        'CANCELLED'
    ));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 4. Atomic order creation transaction function
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
    v_qty INTEGER;
    v_price DECIMAL;
    v_med_name TEXT;
    v_med_active BOOLEAN;
    v_med_schedule TEXT;
    v_stock INTEGER;
BEGIN
    -- 1. Validate each medicine and verify/lock inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_med_id := (v_item->>'medicine_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;
        v_price := (v_item->>'price')::DECIMAL;

        -- Verify medicine existence and active status
        SELECT name, is_active, drug_schedule 
        INTO v_med_name, v_med_active, v_med_schedule
        FROM public.medicines
        WHERE id = v_med_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Medicine not found: %', v_med_id;
        END IF;

        IF NOT v_med_active THEN
            RAISE EXCEPTION 'Medicine % is inactive and unavailable for purchase', v_med_name;
        END IF;

        IF v_med_schedule = 'X' THEN
            RAISE EXCEPTION 'Schedule X narcotics/controlled substances (%) cannot be ordered online as per Indian Drugs and Cosmetics Rules', v_med_name;
        END IF;

        -- Lock inventory row and verify stock
        SELECT stock_quantity INTO v_stock
        FROM public.inventory
        WHERE medicine_id = v_med_id
        FOR UPDATE;

        IF NOT FOUND OR v_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for medicine: % (requested %, available %)', v_med_name, v_qty, COALESCE(v_stock, 0);
        END IF;

        -- Decrement stock atomically
        UPDATE public.inventory
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = now()
        WHERE medicine_id = v_med_id;
    END LOOP;

    -- 2. Insert into orders table
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
        prescription_id
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
        p_prescription_id
    )
    RETURNING id INTO v_order_id;

    -- 3. Insert order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_med_id := (v_item->>'medicine_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;
        v_price := (v_item->>'price')::DECIMAL;

        INSERT INTO public.order_items (
            order_id,
            medicine_id,
            quantity,
            price,
            total
        ) VALUES (
            v_order_id,
            v_med_id,
            v_qty,
            v_price,
            v_price * v_qty
        );
    END LOOP;

    -- 4. If prescription_id is attached, link it to this order
    IF p_prescription_id IS NOT NULL THEN
        UPDATE public.prescriptions
        SET order_id = v_order_id
        WHERE id = p_prescription_id AND (order_id IS NULL OR order_id = v_order_id);
    END IF;

    -- 5. Return created order record
    SELECT * INTO v_order_record FROM public.orders WHERE id = v_order_id;
    RETURN to_jsonb(v_order_record);
END;
$$;

-- Permissions: revoke from public/authenticated/anon (service_role only)
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, JSONB) FROM anon;
