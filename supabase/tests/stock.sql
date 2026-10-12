BEGIN;
SELECT plan(9);

-- Setup test user
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'testuser@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role, full_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'testuser@example.com', 'customer', 'Test Customer')
ON CONFLICT (id) DO NOTHING;

-- 1. Create a dummy medicine and batch
INSERT INTO public.medicines (id, name, slug, price, mrp, composition, is_active)
VALUES ('00000000-0000-0000-0000-000000000002', 'Test Med', 'test-med-pgtap', 10, 20, 'Test Comp', true)
ON CONFLICT (id) DO NOTHING;

-- Batch 1 (Valid, 100 units)
INSERT INTO public.inventory_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
VALUES ('00000000-0000-0000-0000-000000000002', 'TESTBATCH-01', 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year');

-- Batch 2 (Inside expiry buffer 30 days away, 50 units)
INSERT INTO public.inventory_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
VALUES ('00000000-0000-0000-0000-000000000002', 'TESTBATCH-EXP', 50, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days');

-- Create Medicine B (for FEFO spanning)
INSERT INTO public.medicines (id, name, slug, price, mrp, composition, is_active)
VALUES ('00000000-0000-0000-0000-000000000003', 'Test Med B', 'test-med-b', 10, 20, 'Test Comp', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inventory_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
VALUES ('00000000-0000-0000-0000-000000000003', 'TEST-B1', 5, CURRENT_DATE, CURRENT_DATE + INTERVAL '120 days');

INSERT INTO public.inventory_batches (medicine_id, batch_number, quantity, mfg_date, expiry_date)
VALUES ('00000000-0000-0000-0000-000000000003', 'TEST-B2', 10, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year');

-- Test 1: Stock should be 100 (ignores 50 in buffer)
SELECT is(
    (SELECT stock_quantity FROM public.inventory WHERE medicine_id = '00000000-0000-0000-0000-000000000002'),
    100,
    'Stock before order should be 100 (ignoring near-expiry batch)'
);

-- 2. Create order via transaction (Medicines A and B)
DO $$
DECLARE
    v_order JSONB;
BEGIN
    v_order := public.create_order_transaction(
        '00000000-0000-0000-0000-000000000001'::UUID,
        '{"address": "test"}'::jsonb,
        130, 0, 0, 0, 130,
        'PENDING', 'PENDING', 'COD',
        NULL, NULL, 0,
        jsonb_build_array(
            jsonb_build_object('medicine_id', '00000000-0000-0000-0000-000000000002'::UUID, 'quantity', 5, 'price', 10),
            jsonb_build_object('medicine_id', '00000000-0000-0000-0000-000000000003'::UUID, 'quantity', 8, 'price', 10)
        )
    );
    PERFORM set_config('test.last_order_id', v_order->>'id', true);
END $$;

-- Test 2: Check stock after order for Med A
SELECT is(
    (SELECT stock_quantity FROM public.inventory WHERE medicine_id = '00000000-0000-0000-0000-000000000002'),
    95,
    'Stock after order should be 95'
);

-- Test 3: Check FEFO spanning for Med B: Stock should be 7 (15 - 8)
SELECT is(
    (SELECT stock_quantity FROM public.inventory WHERE medicine_id = '00000000-0000-0000-0000-000000000003'),
    7,
    'FEFO Med B stock should be 7'
);

-- Test 4: Check FEFO spanning for Med B (B1 should be 0)
SELECT is(
    (SELECT quantity FROM public.inventory_batches WHERE medicine_id = '00000000-0000-0000-0000-000000000003' AND batch_number = 'TEST-B1'),
    0,
    'FEFO Med B batch B1 should be 0'
);

-- Test 5: Check FEFO spanning for Med B (B2 should be 7)
SELECT is(
    (SELECT quantity FROM public.inventory_batches WHERE medicine_id = '00000000-0000-0000-0000-000000000003' AND batch_number = 'TEST-B2'),
    7,
    'FEFO Med B batch B2 should be 7'
);

-- 3. Cancel and restore stock
SELECT ok(
    public.restore_order_stock(current_setting('test.last_order_id')::UUID),
    'First restore should return true'
);

-- Test 7: Check stock after restore for Med A
SELECT is(
    (SELECT stock_quantity FROM public.inventory WHERE medicine_id = '00000000-0000-0000-0000-000000000002'),
    100,
    'Stock after restore should be 100'
);

-- Test 8: Check stock after restore for Med B
SELECT is(
    (SELECT stock_quantity FROM public.inventory WHERE medicine_id = '00000000-0000-0000-0000-000000000003'),
    15,
    'FEFO Med B stock after restore should be 15'
);

-- 4. Try restoring again (idempotency check)
SELECT ok(
    public.restore_order_stock(current_setting('test.last_order_id')::UUID),
    'Second restore should return true (idempotent skip)'
);

SELECT * FROM finish();
ROLLBACK;
