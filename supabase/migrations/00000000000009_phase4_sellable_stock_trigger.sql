-- 1. Update the sync_inventory_from_batches function to ONLY count sellable stock

CREATE OR REPLACE FUNCTION public.sync_inventory_from_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_expiry_buffer_days INTEGER;
BEGIN
    -- Configurable expiry buffer
    SELECT COALESCE((value->>0)::INTEGER, 90) INTO v_expiry_buffer_days
    FROM public.app_settings WHERE key = 'inventory_expiry_buffer_days';
    
    IF v_expiry_buffer_days IS NULL THEN
        v_expiry_buffer_days := 90;
    END IF;

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update the stock_quantity to only count SELLABLE stock
        UPDATE public.inventory
        SET stock_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM public.inventory_batches
            WHERE medicine_id = NEW.medicine_id
            AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
        ),
        updated_at = NOW()
        WHERE medicine_id = NEW.medicine_id;
        
        -- If inventory record doesn't exist, create it (useful for new medicines)
        IF NOT FOUND THEN
            INSERT INTO public.inventory (medicine_id, stock_quantity, reserved_quantity)
            VALUES (
                NEW.medicine_id, 
                (
                    SELECT COALESCE(SUM(quantity), 0) 
                    FROM public.inventory_batches 
                    WHERE medicine_id = NEW.medicine_id
                    AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
                ), 
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
            AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
        ),
        updated_at = NOW()
        WHERE medicine_id = OLD.medicine_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;
