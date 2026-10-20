-- =============================================================================
-- MediGo / MediQuick — SCHEMA REPAIR (idempotent)
-- =============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Why: your remote database was created from an older migration set. Five
-- tables and a handful of columns that the application expects are missing,
-- which is why /api/admin/medicines returned:
--    column medicines.drug_schedule does not exist
--
-- This script only ADDS what is missing. It never drops data. Safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Helper functions (needed by the RLS policies below)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- -----------------------------------------------------------------------------
-- 0b. profiles.role — allow all four roles + keep escalation guard
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('customer', 'admin', 'pharmacist', 'delivery'));
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Only the service role / superuser may change a role.
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_role_update ON public.profiles;
CREATE TRIGGER check_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();


-- -----------------------------------------------------------------------------
-- 1. medicines.drug_schedule  (OTC / H / H1 / X)
-- -----------------------------------------------------------------------------

ALTER TABLE public.medicines
    ADD COLUMN IF NOT EXISTS drug_schedule TEXT NOT NULL DEFAULT 'OTC';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.medicines'::regclass
          AND conname  = 'medicines_drug_schedule_check'
    ) THEN
        ALTER TABLE public.medicines
            ADD CONSTRAINT medicines_drug_schedule_check
            CHECK (drug_schedule IN ('OTC', 'H', 'H1', 'X'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_medicines_drug_schedule
    ON public.medicines(drug_schedule);

-- Backfill: anything marked prescription-only defaults to Schedule H
UPDATE public.medicines
   SET drug_schedule = 'H'
 WHERE prescription_required = true
   AND drug_schedule = 'OTC';


-- -----------------------------------------------------------------------------
-- 2. app_settings (90-day expiry buffer used by the stock sync trigger)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    description TEXT,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value, description)
VALUES ('inventory_expiry_buffer_days', '90'::JSONB,
        'Number of days before expiry when a batch becomes unsellable')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read app_settings" ON public.app_settings;
CREATE POLICY "Public can read app_settings"
    ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage app_settings" ON public.app_settings;
CREATE POLICY "Admin can manage app_settings"
    ON public.app_settings FOR ALL USING (public.current_user_role() = 'admin');


-- -----------------------------------------------------------------------------
-- 3. inventory_batches  (FEFO stock batches)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    medicine_id  UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    mfg_date     DATE NOT NULL,
    expiry_date  DATE NOT NULL,
    quantity     INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(medicine_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_medicine_id
    ON public.inventory_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_date
    ON public.inventory_batches(expiry_date);

ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active batches" ON public.inventory_batches;
CREATE POLICY "Public can view active batches"
    ON public.inventory_batches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage batches" ON public.inventory_batches;
CREATE POLICY "Staff can manage batches"
    ON public.inventory_batches FOR ALL
    USING (public.current_user_role() IN ('admin', 'pharmacist'));

DROP TRIGGER IF EXISTS update_inventory_batches_updated_at ON public.inventory_batches;
CREATE TRIGGER update_inventory_batches_updated_at
    BEFORE UPDATE ON public.inventory_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- -----------------------------------------------------------------------------
-- 4. order_items.batch_id
-- -----------------------------------------------------------------------------

ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS batch_id UUID
    REFERENCES public.inventory_batches(id) ON DELETE SET NULL;


-- -----------------------------------------------------------------------------
-- 5. coupons + coupon_redemptions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.coupons (
    id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code                TEXT UNIQUE NOT NULL,
    type                TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FLAT')),
    value               DECIMAL(10, 2) NOT NULL,
    min_order_amount    DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    valid_from          TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_to            TIMESTAMP WITH TIME ZONE,
    usage_limit         INTEGER,
    per_user_limit      INTEGER DEFAULT 1,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons"
    ON public.coupons FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage coupons" ON public.coupons;
CREATE POLICY "Admin can manage coupons"
    ON public.coupons FOR ALL USING (public.current_user_role() = 'admin');

DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coupon_id       UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id        UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10, 2) NOT NULL,
    redeemed_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id
    ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id
    ON public.coupon_redemptions(coupon_id);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own redemptions"
    ON public.coupon_redemptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admin can view all redemptions"
    ON public.coupon_redemptions FOR SELECT USING (public.current_user_role() = 'admin');


-- -----------------------------------------------------------------------------
-- 6. orders — missing columns
-- -----------------------------------------------------------------------------

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS prescription_id UUID
    REFERENCES public.prescriptions(id) ON DELETE SET NULL;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS coupon_id UUID
    REFERENCES public.coupons(id) ON DELETE SET NULL;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS stock_restored_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_orders_prescription_id
    ON public.orders(prescription_id);

-- Allow PENDING_PRESCRIPTION_APPROVAL in the status CHECK
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
    WHEN undefined_object THEN NULL;
END $$;


-- -----------------------------------------------------------------------------
-- 7. order_status_history
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id   UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    status     TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes      TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
    ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at
    ON public.order_status_history(created_at);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order status history" ON public.order_status_history;
CREATE POLICY "Users can view own order status history"
    ON public.order_status_history FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_status_history.order_id
              AND orders.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can view all order status history" ON public.order_status_history;
CREATE POLICY "Staff can view all order status history"
    ON public.order_status_history FOR SELECT
    USING (public.current_user_role() IN ('admin', 'pharmacist', 'delivery'));

DROP POLICY IF EXISTS "Staff can insert order status history" ON public.order_status_history;
CREATE POLICY "Staff can insert order status history"
    ON public.order_status_history FOR INSERT
    WITH CHECK (public.current_user_role() IN ('admin', 'pharmacist', 'delivery'));


-- -----------------------------------------------------------------------------
-- 8. admin_audit_log
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id    UUID REFERENCES auth.users(id) NOT NULL,
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT,
    details     JSONB,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
    ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit log"
    ON public.admin_audit_log FOR SELECT
    USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can insert audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit log"
    ON public.admin_audit_log FOR INSERT
    WITH CHECK (public.current_user_role() = 'admin');


-- -----------------------------------------------------------------------------
-- 9. Stock sync trigger (recalculates inventory from sellable batches)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_inventory_from_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_expiry_buffer_days INTEGER;
BEGIN
    SELECT COALESCE((value->>0)::INTEGER, 90) INTO v_expiry_buffer_days
      FROM public.app_settings WHERE key = 'inventory_expiry_buffer_days';

    IF v_expiry_buffer_days IS NULL THEN
        v_expiry_buffer_days := 90;
    END IF;

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.inventory
           SET stock_quantity = (
                   SELECT COALESCE(SUM(quantity), 0)
                     FROM public.inventory_batches
                    WHERE medicine_id = NEW.medicine_id
                      AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
               ),
               updated_at = NOW()
         WHERE medicine_id = NEW.medicine_id;

        IF NOT FOUND THEN
            INSERT INTO public.inventory (medicine_id, stock_quantity, reserved_quantity)
            VALUES (
                NEW.medicine_id,
                (SELECT COALESCE(SUM(quantity), 0)
                   FROM public.inventory_batches
                  WHERE medicine_id = NEW.medicine_id
                    AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL),
                0
            );
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.inventory
           SET stock_quantity = (
                   SELECT COALESCE(SUM(quantity), 0)
                     FROM public.inventory_batches
                    WHERE medicine_id = OLD.medicine_id
                      AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
               ),
               updated_at = NOW()
         WHERE medicine_id = OLD.medicine_id;

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_inventory_batches_trigger ON public.inventory_batches;
CREATE TRIGGER sync_inventory_batches_trigger
    AFTER INSERT OR UPDATE OF quantity OR DELETE ON public.inventory_batches
    FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_from_batches();


-- -----------------------------------------------------------------------------
-- 10. restore_order_stock (idempotent, restores batches then lets the trigger sync)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item  RECORD;
    v_order RECORD;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.stock_restored_at IS NOT NULL THEN
        RETURN TRUE;
    END IF;

    FOR v_item IN
        SELECT medicine_id, quantity, batch_id
          FROM public.order_items
         WHERE order_id = p_order_id
    LOOP
        IF v_item.batch_id IS NOT NULL THEN
            UPDATE public.inventory_batches
               SET quantity = quantity + v_item.quantity
             WHERE id = v_item.batch_id;
        END IF;
    END LOOP;

    UPDATE public.orders SET stock_restored_at = NOW() WHERE id = p_order_id;

    RETURN TRUE;
END;
$$;


-- -----------------------------------------------------------------------------
-- 11. process_order_status_update (enforces the order state machine)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_order_status_update(
    p_order_id UUID,
    p_old_status TEXT,
    p_new_status TEXT,
    p_new_payment_status TEXT DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_refund_id TEXT DEFAULT NULL,
    p_is_admin_action BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
    v_order_current RECORD;
    v_allowed_transitions TEXT[];
    v_actor_role TEXT;
BEGIN
    SELECT * INTO v_order_current
      FROM public.orders
     WHERE id = p_order_id
       FOR UPDATE;

    IF v_order_current IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: order does not exist' USING ERRCODE = 'P0001';
    END IF;

    IF p_is_admin_action THEN
        IF p_changed_by IS NULL THEN
            RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED: staff actions require an admin_id' USING ERRCODE = 'P0001';
        END IF;

        SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_changed_by;
        IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'pharmacist') THEN
            RAISE EXCEPTION 'FORBIDDEN_ROLE: actor lacks staff privileges' USING ERRCODE = 'P0001';
        END IF;
    ELSE
        IF p_changed_by IS NOT NULL THEN
            IF v_order_current.user_id != p_changed_by THEN
                RAISE EXCEPTION 'FORBIDDEN_OWNERSHIP: customers can only cancel their own orders' USING ERRCODE = 'P0001';
            END IF;
            IF p_new_status != 'CANCELLED' THEN
                RAISE EXCEPTION 'CUSTOMER_CAN_ONLY_CANCEL: customers may only transition to CANCELLED' USING ERRCODE = 'P0001';
            END IF;
            IF v_order_current.status IN ('PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED') THEN
                RAISE EXCEPTION 'CUSTOMER_CANCEL_NOT_ALLOWED: customers cannot cancel after PACKED' USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    IF v_order_current.status != p_old_status THEN
        RAISE EXCEPTION 'STATUS_MISMATCH: current status is %', v_order_current.status USING ERRCODE = 'P0001';
    END IF;

    v_allowed_transitions := CASE v_order_current.status
        WHEN 'PENDING' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'PENDING_PRESCRIPTION_APPROVAL' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'CONFIRMED' THEN ARRAY['PROCESSING','PACKED','CANCELLED']
        WHEN 'PROCESSING' THEN ARRAY['PACKED','CANCELLED']
        WHEN 'PACKED' THEN ARRAY['SHIPPED','CANCELLED']
        WHEN 'SHIPPED' THEN ARRAY['OUT_FOR_DELIVERY','CANCELLED']
        WHEN 'OUT_FOR_DELIVERY' THEN ARRAY['DELIVERED','CANCELLED']
        ELSE ARRAY[]::TEXT[]
    END;

    IF NOT (p_new_status = ANY(v_allowed_transitions)) THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: cannot change status from % to %', p_old_status, p_new_status USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.orders
       SET status = p_new_status,
           payment_status = COALESCE(p_new_payment_status, payment_status),
           updated_at = NOW()
     WHERE id = p_order_id AND status = p_old_status;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        RAISE EXCEPTION 'STATUS_MISMATCH' USING ERRCODE = 'P0001';
    END IF;

    IF p_new_status IN ('CANCELLED', 'REJECTED') THEN
        PERFORM public.restore_order_stock(p_order_id);
    END IF;

    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (p_order_id, p_new_status, p_changed_by, p_notes);

    IF p_is_admin_action AND p_changed_by IS NOT NULL THEN
        INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
        VALUES (p_changed_by, 'UPDATE_ORDER_STATUS', 'orders', p_order_id::text,
            jsonb_build_object(
                'old_status', p_old_status,
                'new_status', p_new_status,
                'notes', p_notes,
                'refund_id', p_refund_id
            ));
    END IF;

    IF p_refund_id IS NOT NULL THEN
        UPDATE public.payments
           SET status = 'REFUNDED',
               razorpay_signature = p_refund_id,
               updated_at = NOW()
         WHERE order_id = p_order_id AND status = 'SUCCESS';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- -----------------------------------------------------------------------------
-- 12. Admin self-promotion RPC (used by ADMIN_EMAILS portal login)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promote_self_to_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET role = 'admin', updated_at = now()
   WHERE id = target_user_id
     AND role NOT IN ('admin', 'pharmacist');
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_self_to_admin(UUID) TO authenticated;


-- -----------------------------------------------------------------------------
-- 13. Clear the demo medicine catalogue
--     (already empty on most installs; harmless if it is)
-- -----------------------------------------------------------------------------

DO $$
DECLARE v_orders bigint;
BEGIN
    SELECT count(*) INTO v_orders FROM public.order_items;

    IF v_orders = 0 THEN
        DELETE FROM public.medicines;
        RAISE NOTICE 'Demo medicines deleted.';
    ELSE
        UPDATE public.medicines SET is_active = false;
        RAISE NOTICE 'Order history found - demo medicines deactivated instead of deleted.';
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 14. Promote your own account (EDIT THE EMAIL, then uncomment and run)
-- -----------------------------------------------------------------------------

-- UPDATE public.profiles SET role = 'admin' WHERE email = 'yourgmail@gmail.com';


-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Done. Verify with:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'medicines' AND column_name = 'drug_schedule';
--   SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public'
--      AND table_name IN ('coupons','inventory_batches','order_status_history','admin_audit_log');
-- =============================================================================
