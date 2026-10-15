BEGIN;

SELECT plan(17);

-- 1. Setup test fixture data
INSERT INTO auth.users (id, email) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cust_a@test.com'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cust_b@test.com'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin_staff@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role, full_name) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cust_a@test.com', 'customer', 'Customer A'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cust_b@test.com', 'customer', 'Customer B'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin_staff@test.com', 'admin', 'Admin Staff')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.medicines (id, name, slug, brand, composition, mrp, price, drug_schedule, prescription_required, is_active)
VALUES ('11111111-2222-3333-4444-555555555555', 'Status Test Med', 'status-test-med', 'MedBrand', 'Comp', 100, 80, 'OTC', false, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inventory_batches (id, medicine_id, batch_number, mfg_date, expiry_date, quantity)
VALUES ('bbbbbbbb-1111-2222-3333-444444444444', '11111111-2222-3333-4444-555555555555', 'BATCH-STAT-1', CURRENT_DATE, CURRENT_DATE + INTERVAL '180 days', 8)
ON CONFLICT (id) DO UPDATE SET quantity = 8;

-- Order 1: Owned by Customer A, CONFIRMED
INSERT INTO public.orders (id, user_id, address_snapshot, subtotal, total_amount, status, payment_method, payment_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"city":"Test"}'::jsonb, 160, 160, 'CONFIRMED', 'ONLINE', 'PENDING')
ON CONFLICT (id) DO UPDATE SET status = 'CONFIRMED', stock_restored_at = NULL;

INSERT INTO public.order_items (id, order_id, medicine_id, batch_id, quantity, price, total)
VALUES ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '11111111-2222-3333-4444-555555555555', 'bbbbbbbb-1111-2222-3333-444444444444', 2, 80, 160)
ON CONFLICT (id) DO NOTHING;

-- Order 2: Owned by Customer A, PACKED
INSERT INTO public.orders (id, user_id, address_snapshot, subtotal, total_amount, status, payment_method, payment_status)
VALUES ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"city":"Test"}'::jsonb, 80, 80, 'PACKED', 'ONLINE', 'PAID')
ON CONFLICT (id) DO UPDATE SET status = 'PACKED', stock_restored_at = NULL;

-- -------------------------------------------------------------
-- Test 1: Invalid transition raises
-- -------------------------------------------------------------
SELECT throws_ok(
    $$SELECT public.process_order_status_update('00000000-0000-0000-0000-000000000001', 'CONFIRMED', 'DELIVERED', NULL, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'skip to delivered', NULL, true)$$,
    'P0001',
    'INVALID_TRANSITION: cannot change status from CONFIRMED to DELIVERED',
    'Invalid transition from CONFIRMED to DELIVERED raises exception'
);

-- -------------------------------------------------------------
-- Test 2: Customer cancels only their own order
-- -------------------------------------------------------------
SELECT throws_ok(
    $$SELECT public.process_order_status_update('00000000-0000-0000-0000-000000000001', 'CONFIRMED', 'CANCELLED', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cust B cancel cust A', NULL, false)$$,
    'P0001',
    'FORBIDDEN_OWNERSHIP: customers can only cancel their own orders',
    'Customer B cannot cancel Customer A order'
);

-- -------------------------------------------------------------
-- Test 3: Customer can only cancel to CANCELLED
-- -------------------------------------------------------------
SELECT throws_ok(
    $$SELECT public.process_order_status_update('00000000-0000-0000-0000-000000000001', 'CONFIRMED', 'PROCESSING', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cust change to processing', NULL, false)$$,
    'P0001',
    'CUSTOMER_CAN_ONLY_CANCEL: customers may only transition to CANCELLED',
    'Customer cannot change order status to anything other than CANCELLED'
);

-- -------------------------------------------------------------
-- Test 4: No customer cancel after PACKED (staff may cancel)
-- -------------------------------------------------------------
SELECT throws_ok(
    $$SELECT public.process_order_status_update('00000000-0000-0000-0000-000000000002', 'PACKED', 'CANCELLED', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cust cancel packed', NULL, false)$$,
    'P0001',
    'CUSTOMER_CANCEL_NOT_ALLOWED: customers cannot cancel after PACKED',
    'Customer cannot cancel order once it is PACKED'
);

SELECT lives_ok(
    $$SELECT public.process_order_status_update('00000000-0000-0000-0000-000000000002', 'PACKED', 'CANCELLED', 'REFUNDED', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'staff cancel packed', NULL, true)$$,
    'Staff can cancel an order even if it is PACKED'
);

-- -------------------------------------------------------------
-- Test 5: Stale old_status conflicts
-- -------------------------------------------------------------
SELECT throws_ok(
    $$SELECT public.process_order_status_update('00000000-0000-0000-0000-000000000001', 'PENDING', 'CANCELLED', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'stale status', NULL, false)$$,
    'P0001',
    'STATUS_MISMATCH: current status is CONFIRMED',
    'Stale old_status raises STATUS_MISMATCH conflict'
);

-- -------------------------------------------------------------
-- Test 6: One order_status_history row per transition and audit log for staff
-- -------------------------------------------------------------
-- Clean previous history for Order 1
DELETE FROM public.order_status_history WHERE order_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.admin_audit_log WHERE entity_id = '00000000-0000-0000-0000-000000000001';

-- Customer cancels Order 1
SELECT lives_ok(
    $$SELECT public.process_order_status_update('00000000-0000-0000-0000-000000000001', 'CONFIRMED', 'CANCELLED', NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Customer cancel order 1', NULL, false)$$,
    'Customer successfully cancels their own CONFIRMED order'
);

SELECT results_eq(
    $$SELECT count(*) FROM public.order_status_history WHERE order_id = '00000000-0000-0000-0000-000000000001'$$,
    ARRAY[1::bigint],
    'Exactly one order_status_history row created for customer cancellation'
);

SELECT results_eq(
    $$SELECT count(*) FROM public.admin_audit_log WHERE entity_id = '00000000-0000-0000-0000-000000000001'$$,
    ARRAY[0::bigint],
    'No admin_audit_log row created for non-staff customer cancellation'
);

-- Order 2 was cancelled by staff in Test 4: verify exactly 1 admin_audit_log row was inserted
SELECT results_eq(
    $$SELECT count(*) FROM public.admin_audit_log WHERE entity_id = '00000000-0000-0000-0000-000000000002' AND action = 'UPDATE_ORDER_STATUS'$$,
    ARRAY[1::bigint],
    'Exactly one admin_audit_log row created for staff status update'
);

-- -------------------------------------------------------------
-- Test 7: Stock restored exactly once (second cancel changes nothing)
-- -------------------------------------------------------------
-- Batch had 8 before Order 1 cancel. Order 1 had 2 units.
-- After Order 1 cancel in Test 6, batch should now have 10.
SELECT results_eq(
    $$SELECT quantity FROM public.inventory_batches WHERE id = 'bbbbbbbb-1111-2222-3333-444444444444'$$,
    ARRAY[10],
    'Stock restored on first cancellation from 8 to 10'
);

-- Call restore_order_stock second time
SELECT lives_ok(
    $$SELECT public.restore_order_stock('00000000-0000-0000-0000-000000000001')$$,
    'Second call to restore_order_stock executes cleanly as idempotent no-op'
);

-- Verify quantity remains 10 (not 12)
SELECT results_eq(
    $$SELECT quantity FROM public.inventory_batches WHERE id = 'bbbbbbbb-1111-2222-3333-444444444444'$$,
    ARRAY[10],
    'Stock restored exactly once; second call did not double-increment stock'
);

-- -------------------------------------------------------------
-- Test 8: Unpaid online orders older than 30 mins expire, COD untouched
-- -------------------------------------------------------------
-- Create Order 10: ONLINE, PENDING, created 45 mins ago
INSERT INTO public.orders (id, user_id, address_snapshot, subtotal, total_amount, status, payment_method, payment_status, created_at)
VALUES ('00000000-0000-0000-0000-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"city":"Test"}'::jsonb, 50, 50, 'PENDING', 'ONLINE', 'PENDING', NOW() - INTERVAL '45 minutes')
ON CONFLICT (id) DO UPDATE SET status = 'PENDING', payment_status = 'PENDING', created_at = NOW() - INTERVAL '45 minutes';

-- Create Order 11: COD, PENDING, created 45 mins ago
INSERT INTO public.orders (id, user_id, address_snapshot, subtotal, total_amount, status, payment_method, payment_status, created_at)
VALUES ('00000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"city":"Test"}'::jsonb, 50, 50, 'PENDING', 'COD', 'PENDING', NOW() - INTERVAL '45 minutes')
ON CONFLICT (id) DO UPDATE SET status = 'PENDING', payment_status = 'PENDING', created_at = NOW() - INTERVAL '45 minutes';

-- Create Order 12: ONLINE, PENDING, created 5 mins ago (fresh)
INSERT INTO public.orders (id, user_id, address_snapshot, subtotal, total_amount, status, payment_method, payment_status, created_at)
VALUES ('00000000-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"city":"Test"}'::jsonb, 50, 50, 'PENDING', 'ONLINE', 'PENDING', NOW() - INTERVAL '5 minutes')
ON CONFLICT (id) DO UPDATE SET status = 'PENDING', payment_status = 'PENDING', created_at = NOW() - INTERVAL '5 minutes';

-- Run expire_unpaid_orders
SELECT results_eq(
    $$SELECT public.expire_unpaid_orders()$$,
    ARRAY[1],
    'expire_unpaid_orders expires exactly 1 order'
);

-- Verify Order 10 is CANCELLED
SELECT results_eq(
    $$SELECT status FROM public.orders WHERE id = '00000000-0000-0000-0000-000000000010'$$,
    ARRAY['CANCELLED'::text],
    'Unpaid online order older than 30 minutes expired to CANCELLED'
);

-- Verify Order 11 (COD) is untouched (still PENDING)
SELECT results_eq(
    $$SELECT status FROM public.orders WHERE id = '00000000-0000-0000-0000-000000000011'$$,
    ARRAY['PENDING'::text],
    'COD order older than 30 minutes remains untouched in PENDING status'
);

-- Verify Order 12 (fresh online) is untouched (still PENDING)
SELECT results_eq(
    $$SELECT status FROM public.orders WHERE id = '00000000-0000-0000-0000-000000000012'$$,
    ARRAY['PENDING'::text],
    'Fresh online order within 30 minutes remains in PENDING status'
);

SELECT * FROM finish();
ROLLBACK;
