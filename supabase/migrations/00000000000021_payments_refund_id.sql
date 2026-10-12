-- 00000000000021_payments_refund_id.sql
-- Add dedicated razorpay_refund_id column to payments table

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT;

-- Backfill existing refunded rows if any were stored in razorpay_signature
UPDATE public.payments
SET razorpay_refund_id = razorpay_signature
WHERE status IN ('REFUNDED', 'PENDING_REFUND')
  AND razorpay_refund_id IS NULL
  AND razorpay_signature IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_refund_id
ON public.payments (razorpay_refund_id);
