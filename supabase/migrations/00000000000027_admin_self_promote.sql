-- ---------------------------------------------------------------------------
-- Allow admin-portal users to promote their own profile role to 'admin'.
--
-- The /api/auth/promote-admin endpoint calls this RPC after verifying the
-- caller's email is in the ADMIN_EMAILS environment variable (server-side).
--
-- Using SECURITY DEFINER means the function runs as the DB owner and can
-- update the profiles table regardless of RLS.  The GRANT ensures any
-- authenticated Supabase user can invoke it (the server validates permissions
-- before calling).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promote_self_to_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET    role = 'admin', updated_at = now()
  WHERE  id = target_user_id
    AND  role NOT IN ('admin', 'pharmacist');
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_self_to_admin(UUID) TO authenticated;
