-- Drop the older overlapping trigger and function from migration 11
DROP TRIGGER IF EXISTS check_pharmacist_price_change ON public.medicines;
DROP FUNCTION IF EXISTS public.prevent_pharmacist_price_change();

-- Update the newer trigger from migration 14 to cover all restricted fields
CREATE OR REPLACE FUNCTION public.enforce_pharmacist_medicine_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY
DECLARE
    v_uid UUID;
    v_role TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.mrp IS DISTINCT FROM NEW.mrp OR
           OLD.price IS DISTINCT FROM NEW.price OR
           OLD.drug_schedule IS DISTINCT FROM NEW.drug_schedule OR
           OLD.prescription_required IS DISTINCT FROM NEW.prescription_required OR
           OLD.is_active IS DISTINCT FROM NEW.is_active OR
           OLD.composition IS DISTINCT FROM NEW.composition OR
           OLD.manufacturer IS DISTINCT FROM NEW.manufacturer THEN

            -- auth.uid() is NULL under service_role; skip check
            v_uid := auth.uid();
            IF v_uid IS NOT NULL THEN
                SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
                IF v_role = 'pharmacist' THEN
                    RAISE EXCEPTION 'Pharmacists are not allowed to modify restricted fields (Price, MRP, Schedule, etc.).';
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$BODY;
