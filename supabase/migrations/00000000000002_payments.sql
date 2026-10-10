DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'COD' CHECK (payment_method IN ('ONLINE', 'COD'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stock_restored') THEN
        ALTER TABLE public.orders ADD COLUMN stock_restored BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Drop and recreate the CHECK constraint for payments.status to include 'REFUNDED'
DO $$
BEGIN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Unique constraints and indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_razorpay_order_id_key') THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_razorpay_order_id_key UNIQUE (razorpay_order_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_razorpay_payment_id_key') THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_razorpay_payment_id_key UNIQUE (razorpay_payment_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- Webhook events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT,
    processed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies, meaning only service role has access

-- Restore order stock function
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_record RECORD;
    v_item RECORD;
BEGIN
    -- Lock the order row
    SELECT * INTO v_order_record FROM public.orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order_record IS NULL THEN
        RETURN false;
    END IF;
    
    IF v_order_record.stock_restored THEN
        RETURN false;
    END IF;
    
    -- Restore stock for each item
    FOR v_item IN SELECT medicine_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
        UPDATE public.inventory
        SET stock_quantity = stock_quantity + v_item.quantity,
            updated_at = now()
        WHERE medicine_id = v_item.medicine_id;
    END LOOP;
    
    -- Mark stock as restored
    UPDATE public.orders SET stock_restored = true, updated_at = now() WHERE id = p_order_id;
    
    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_order_stock(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_order_stock(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_order_stock(UUID) FROM anon;

-- Mark payment success function
CREATE OR REPLACE FUNCTION public.mark_payment_success(p_razorpay_order_id TEXT, p_razorpay_payment_id TEXT, p_signature TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_record RECORD;
    v_order_status TEXT;
BEGIN
    -- Lock the payment row
    SELECT * INTO v_payment_record FROM public.payments WHERE razorpay_order_id = p_razorpay_order_id FOR UPDATE;
    
    IF v_payment_record IS NULL THEN
        RETURN false;
    END IF;
    
    IF v_payment_record.status = 'SUCCESS' THEN
        RETURN true; -- Idempotent
    END IF;
    
    -- Lock the order row
    SELECT status INTO v_order_status FROM public.orders WHERE id = v_payment_record.order_id FOR UPDATE;
    
    IF v_order_status IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update payment
    UPDATE public.payments 
    SET status = 'SUCCESS',
        razorpay_payment_id = p_razorpay_payment_id,
        razorpay_signature = p_signature,
        updated_at = now()
    WHERE id = v_payment_record.id;
    
    -- Update order if not cancelled
    IF v_order_status != 'CANCELLED' THEN
        UPDATE public.orders
        SET payment_status = 'PAID',
            status = 'CONFIRMED',
            updated_at = now()
        WHERE id = v_payment_record.order_id;
    END IF;
    
    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_payment_success(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_payment_success(TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_payment_success(TEXT, TEXT, TEXT) FROM anon;
