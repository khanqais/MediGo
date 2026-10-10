-- 1. Backfill legacy batches for existing inventory
INSERT INTO public.inventory_batches (medicine_id, batch_number, mfg_date, expiry_date, quantity)
SELECT 
    i.medicine_id, 
    'LEGACY' AS batch_number, 
    CURRENT_DATE AS mfg_date, 
    CURRENT_DATE + INTERVAL '1 year' AS expiry_date, 
    i.stock_quantity
FROM public.inventory i
WHERE i.stock_quantity > 0
ON CONFLICT (medicine_id, batch_number) DO NOTHING;

-- 2. Add trigger to sync inventory table
CREATE OR REPLACE FUNCTION public.sync_inventory_from_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update the stock_quantity in inventory table based on sum of active batches
        UPDATE public.inventory
        SET stock_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM public.inventory_batches
            WHERE medicine_id = NEW.medicine_id
        ),
        updated_at = NOW()
        WHERE medicine_id = NEW.medicine_id;
        
        -- If inventory record doesn't exist, create it (useful for new medicines)
        IF NOT FOUND THEN
            INSERT INTO public.inventory (medicine_id, stock_quantity, reserved_quantity)
            VALUES (
                NEW.medicine_id, 
                (SELECT COALESCE(SUM(quantity), 0) FROM public.inventory_batches WHERE medicine_id = NEW.medicine_id), 
                0
            );
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update the stock_quantity in inventory table
        UPDATE public.inventory
        SET stock_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM public.inventory_batches
            WHERE medicine_id = OLD.medicine_id
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
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_from_batches();
