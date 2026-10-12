BEGIN;

SELECT plan(10);

-- Setup fake auth context
CREATE OR REPLACE FUNCTION set_auth(p_role text, p_user_id uuid) RETURNS void AS $$
BEGIN
    PERFORM set_config('role', p_role, true);
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "%s"}', p_user_id, p_role), true);
END;
$$ LANGUAGE plpgsql;

-- 1. Create test users
INSERT INTO auth.users (id, email) VALUES
('11111111-1111-1111-1111-111111111111', 'customer@test.com'),
('22222222-2222-2222-2222-222222222222', 'admin@test.com'),
('33333333-3333-3333-3333-333333333333', 'pharmacist@test.com'),
('44444444-4444-4444-4444-444444444444', 'delivery@test.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, email, role, full_name) VALUES
('11111111-1111-1111-1111-111111111111', 'customer@test.com', 'customer', 'Customer Test'),
('22222222-2222-2222-2222-222222222222', 'admin@test.com', 'admin', 'Admin Test'),
('33333333-3333-3333-3333-333333333333', 'pharmacist@test.com', 'pharmacist', 'Pharmacist Test'),
('44444444-4444-4444-4444-444444444444', 'delivery@test.com', 'delivery', 'Delivery Test')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

-- 2. Create a test medicine
INSERT INTO public.medicines (id, name, slug, brand, composition, mrp, price, drug_schedule, prescription_required, is_active)
VALUES ('99999999-9999-9999-9999-999999999999', 'Test Med', 'test-med-rls', 'Test Brand', 'Salt', 100, 80, 'OTC', false, true)
ON CONFLICT DO NOTHING;

-- 3. Create a test order for customer
INSERT INTO public.orders (id, user_id, address_snapshot, subtotal, total_amount, status)
VALUES ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '{"address": "test"}'::jsonb, 100, 100, 'PENDING')
ON CONFLICT DO NOTHING;

-- Test 1: Delivery cannot read customer orders
SELECT set_auth('authenticated', '44444444-4444-4444-4444-444444444444');
SELECT results_eq(
    'SELECT count(*) FROM public.orders WHERE id = ''88888888-8888-8888-8888-888888888888''',
    ARRAY[0::bigint],
    'Delivery role should see 0 orders due to RLS'
);

-- Test 2: Customer can read their own order
SELECT set_auth('authenticated', '11111111-1111-1111-1111-111111111111');
SELECT results_eq(
    'SELECT count(*) FROM public.orders WHERE id = ''88888888-8888-8888-8888-888888888888''',
    ARRAY[1::bigint],
    'Customer should see exactly their 1 order'
);

-- Test 3: Admin can read all orders
SELECT set_auth('authenticated', '22222222-2222-2222-2222-222222222222');
SELECT results_eq(
    'SELECT count(*) FROM public.orders WHERE id = ''88888888-8888-8888-8888-888888888888''',
    ARRAY[1::bigint],
    'Admin should see the order'
);

-- Test 4: Pharmacist cannot update price
SELECT set_auth('authenticated', '33333333-3333-3333-3333-333333333333');
SELECT throws_ok(
    'UPDATE public.medicines SET price = 50 WHERE id = ''99999999-9999-9999-9999-999999999999''',
    'P0001',
    NULL,
    'Pharmacist cannot update medicine price'
);

-- Test 5: Pharmacist cannot update prescription_required
SELECT throws_ok(
    'UPDATE public.medicines SET prescription_required = true WHERE id = ''99999999-9999-9999-9999-999999999999''',
    'P0001',
    NULL,
    'Pharmacist cannot update prescription_required'
);

-- Test 6: Pharmacist cannot update is_active
SELECT throws_ok(
    'UPDATE public.medicines SET is_active = false WHERE id = ''99999999-9999-9999-9999-999999999999''',
    'P0001',
    NULL,
    'Pharmacist cannot update is_active'
);

-- Test 7: Pharmacist can update description
SELECT lives_ok(
    'UPDATE public.medicines SET description = ''Updated by pharma'' WHERE id = ''99999999-9999-9999-9999-999999999999''',
    'Pharmacist can update other medicine fields'
);
SELECT results_eq(
    'SELECT description FROM public.medicines WHERE id = ''99999999-9999-9999-9999-999999999999''',
    ARRAY['Updated by pharma'::text],
    'Pharmacist update actually modified the description row'
);

-- Test 8: Admin can update price
SELECT set_auth('authenticated', '22222222-2222-2222-2222-222222222222');
SELECT lives_ok(
    'UPDATE public.medicines SET price = 90 WHERE id = ''99999999-9999-9999-9999-999999999999''',
    'Admin can update price'
);
SELECT results_eq(
    'SELECT price FROM public.medicines WHERE id = ''99999999-9999-9999-9999-999999999999''',
    ARRAY[90::numeric],
    'Admin update actually modified the price row'
);

SELECT * FROM finish();
ROLLBACK;
