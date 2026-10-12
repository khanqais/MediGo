-- 00000000000022_refunds_table.sql
-- Dedicated refunds table to decouple refund lifecycle and locking from payments table

-- 1. Create dedicated refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    razorpay_payment_id TEXT NOT NULL UNIQUE,
    razorpay_refund_id TEXT,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REFUNDED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_razorpay_refund_id ON public.refunds(razorpay_refund_id);

-- 3. Drop partial index from migration 20 on payments table
DROP INDEX IF EXISTS public.idx_payments_single_refund_per_charge;

-- 4. Enable RLS: service role only
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.refunds FROM anon, authenticated, public;
GRANT ALL ON TABLE public.refunds TO service_role;
GRANT ALL ON TABLE public.refunds TO postgres;
