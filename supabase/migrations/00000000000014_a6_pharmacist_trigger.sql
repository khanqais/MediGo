-- A6. Pharmacist price/MRP restriction DB Trigger (second-layer defense)
--
-- IMPORTANT: When the API uses createAdminClient() (service_role), auth.uid()
-- returns NULL. In that case v_role will be NULL, which does NOT match
-- 'pharmacist', so the trigger allows the update. This is correct because
-- the API route itself enforces the pharmacist restriction before calling
-- the DB. This trigger only fires as a safety net when a direct
-- user-session client bypasses the API.

CREATE OR REPLACE FUNCTION public.enforce_pharmacist_medicine_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_role TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.mrp IS DISTINCT FROM NEW.mrp OR
           OLD.price IS DISTINCT FROM NEW.price OR
           OLD.drug_schedule IS DISTINCT FROM NEW.drug_schedule THEN

            -- auth.uid() is NULL under service_role; skip check
            v_uid := auth.uid();
            IF v_uid IS NOT NULL THEN
                SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
                IF v_role = 'pharmacist' THEN
                    RAISE EXCEPTION 'Pharmacists are not allowed to modify MRP, Price, or Drug Schedule.';
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_pharmacist_medicine_update ON public.medicines;
CREATE TRIGGER restrict_pharmacist_medicine_update
BEFORE UPDATE ON public.medicines
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pharmacist_medicine_restrictions();
