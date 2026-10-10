-- Phase 2 Migration: User Roles, Staff RLS, and Order Status History

-- 1. Extend profiles.role CHECK constraint to: customer, admin, pharmacist, delivery
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('customer', 'admin', 'pharmacist', 'delivery'));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 2. Ensure prevent_role_escalation trigger function is up to date
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Prevent role escalation unless performed by the service_role or a superuser.
    -- PostgREST sets the role to 'authenticated' or 'anon' for client requests.
    -- The service_role key sets it to 'service_role'.
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      NEW.role = OLD.role;
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

-- 3. Create helper function for role lookup in RLS policies (SECURITY DEFINER avoids recursion on profiles)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. Create order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON public.order_status_history(created_at);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for order_status_history
DROP POLICY IF EXISTS "Users can view own order status history" ON public.order_status_history;
CREATE POLICY "Users can view own order status history" ON public.order_status_history
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Staff can view all order status history" ON public.order_status_history;
CREATE POLICY "Staff can view all order status history" ON public.order_status_history
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

DROP POLICY IF EXISTS "Staff can insert order status history" ON public.order_status_history;
CREATE POLICY "Staff can insert order status history" ON public.order_status_history
FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

-- 6. Additional Staff RLS Policies across tables

-- Profiles
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles" ON public.profiles
FOR UPDATE USING (
    public.current_user_role() = 'admin'
);

-- Orders
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
CREATE POLICY "Staff can view all orders" ON public.orders
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

-- Order Items
DROP POLICY IF EXISTS "Staff can view all order items" ON public.order_items;
CREATE POLICY "Staff can view all order items" ON public.order_items
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

-- Prescriptions
DROP POLICY IF EXISTS "Staff can view all prescriptions" ON public.prescriptions;
CREATE POLICY "Staff can view all prescriptions" ON public.prescriptions
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can update prescriptions" ON public.prescriptions;
CREATE POLICY "Staff can update prescriptions" ON public.prescriptions
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

-- Medicines
DROP POLICY IF EXISTS "Staff can view all medicines" ON public.medicines;
CREATE POLICY "Staff can view all medicines" ON public.medicines
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can insert medicines" ON public.medicines;
CREATE POLICY "Staff can insert medicines" ON public.medicines
FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can update medicines" ON public.medicines;
CREATE POLICY "Staff can update medicines" ON public.medicines
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Admin can delete medicines" ON public.medicines;
CREATE POLICY "Admin can delete medicines" ON public.medicines
FOR DELETE USING (
    public.current_user_role() = 'admin'
);

-- Inventory
DROP POLICY IF EXISTS "Staff can insert inventory" ON public.inventory;
CREATE POLICY "Staff can insert inventory" ON public.inventory
FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can update inventory" ON public.inventory;
CREATE POLICY "Staff can update inventory" ON public.inventory
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);
