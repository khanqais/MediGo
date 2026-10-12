BEGIN;

SELECT plan(3);

-- Setup test user
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000010', 'refunduser@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role, full_name)
VALUES ('00000000-0000-0000-0000-000000000010', 'refunduser@example.com', 'customer', 'Refund Test Customer')
ON CONFLICT (id) DO NOTHING;

-- Create test order
INSERT INTO public.orders (id, user_id, address_snapshot, subtotal, total_amount, status, payment_status, payment_method)
VALUES (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    '{"address": "Test street"}'::jsonb,
    500,
    500,
    'CONFIRMED',
    'PAID',
    'ONLINE'
)
ON CONFLICT (id) DO NOTHING;

-- Create test payment
INSERT INTO public.payments (id, order_id, razorpay_order_id, razorpay_payment_id, amount, status)
VALUES (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000020',
    'order_rzp_test_123',
    'pay_rzp_test_uniq_999',
    500,
    'SUCCESS'
)
ON CONFLICT (id) DO NOTHING;

-- Test 1: Insert initial refund row succeeds
SELECT lives_ok(
    $$
    INSERT INTO public.refunds (id, order_id, payment_id, razorpay_payment_id, amount, status)
    VALUES (
        '00000000-0000-0000-0000-000000000040',
        '00000000-0000-0000-0000-000000000020',
        '00000000-0000-0000-0000-000000000030',
        'pay_rzp_test_uniq_999',
        500,
        'PENDING'
    )
    $$,
    'First refund row with razorpay_payment_id should insert successfully'
);

-- Test 2: Inserting duplicate refund row with the SAME razorpay_payment_id must throw 23505 unique violation
SELECT throws_ok(
    $$
    INSERT INTO public.refunds (order_id, payment_id, razorpay_payment_id, amount, status)
    VALUES (
        '00000000-0000-0000-0000-000000000020',
        '00000000-0000-0000-0000-000000000030',
        'pay_rzp_test_uniq_999',
        500,
        'PENDING'
    )
    $$,
    '23505',
    NULL,
    'Inserting second refund row with identical razorpay_payment_id must fail unique constraint'
);

-- Test 3: RLS ensures anon and authenticated roles have no access to refunds table
SET LOCAL ROLE authenticated;
SELECT throws_ok(
    'SELECT * FROM public.refunds',
    '42501',
    NULL,
    'Authenticated role must not have permission on public.refunds (service role only)'
);

SELECT * FROM finish();
ROLLBACK;
