-- Step 2.3: Tighten RLS

-- 1. Restrict delivery role from reading all orders
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
CREATE POLICY "Staff can view all orders" ON public.orders
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

-- Ensure customers can view their own orders (re-asserting just in case)
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT USING (
    auth.uid() = user_id
);

-- 2. Pharmacists cannot change medicine price/MRP (admin only)
CREATE OR REPLACE FUNCTION prevent_pharmacist_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF public.current_user_role() = 'pharmacist' THEN
        IF NEW.price IS DISTINCT FROM OLD.price OR NEW.mrp IS DISTINCT FROM OLD.mrp THEN
            RAISE EXCEPTION 'Pharmacists are not allowed to change medicine price or MRP. Contact an admin.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_pharmacist_price_change ON public.medicines;
CREATE TRIGGER check_pharmacist_price_change
    BEFORE UPDATE ON public.medicines
    FOR EACH ROW
    EXECUTE FUNCTION prevent_pharmacist_price_change();
