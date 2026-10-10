-- 1. Prevent Role Escalation via Trigger
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

CREATE TRIGGER check_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- 2. Remove client-side order insertion policy
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;

-- 3. Add public read access to inventory
CREATE POLICY "Public can view inventory" ON public.inventory FOR SELECT USING (true);
