-- Create a partial unique index so only one active refund row exists per razorpay_payment_id
-- (either PENDING_REFUND or REFUNDED). This prevents race conditions creating multiple refunds.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_single_refund_per_charge 
ON public.payments (razorpay_payment_id) 
WHERE status IN ('PENDING_REFUND', 'REFUNDED');
