-- Step 3 Fixes

-- 1. Create recalculate_all_inventory function for the cron job
CREATE OR REPLACE FUNCTION public.recalculate_all_inventory()
RETURNS void AS $$
BEGIN
    UPDATE public.inventory i
    SET stock_quantity = COALESCE((
        SELECT SUM(b.quantity)
        FROM public.inventory_batches b
        WHERE b.medicine_id = i.medicine_id
        AND b.expiry_date > (CURRENT_DATE + INTERVAL '3 months')
    ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create rate_limits table for serverless rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key text PRIMARY KEY,
    tokens integer NOT NULL,
    last_refilled timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_ms integer)
RETURNS json AS $$
DECLARE
    v_tokens integer;
    v_last_refilled timestamp with time zone;
    v_now timestamp with time zone := now();
    v_elapsed_ms float;
    v_reset_time timestamp with time zone;
    v_allowed boolean;
BEGIN
    INSERT INTO public.rate_limits (key, tokens, last_refilled)
    VALUES (p_key, p_limit - 1, v_now)
    ON CONFLICT (key) DO UPDATE 
    SET tokens = 
        CASE 
            WHEN EXCLUDED.last_refilled >= rate_limits.last_refilled + (p_window_ms || ' milliseconds')::interval 
            THEN p_limit - 1
            ELSE GREATEST(rate_limits.tokens - 1, 0)
        END,
        last_refilled = 
        CASE 
            WHEN EXCLUDED.last_refilled >= rate_limits.last_refilled + (p_window_ms || ' milliseconds')::interval 
            THEN EXCLUDED.last_refilled
            ELSE rate_limits.last_refilled
        END
    RETURNING tokens, last_refilled INTO v_tokens, v_last_refilled;

    v_reset_time := v_last_refilled + (p_window_ms || ' milliseconds')::interval;
    
    -- If it was just refilled or tokens are still > 0 before subtraction (which means >= 0 after)
    -- Actually, if tokens returned is > 0, it means we had enough.
    -- Wait, if it returned 0, it means it was the last allowed request.
    -- Wait, if it was already 0 before, and we didn't refill, GREATEST(0 - 1, 0) = 0.
    -- We need to know if it actually decremented.
    -- Let's change the logic.
    
    SELECT rate_limits.tokens, rate_limits.last_refilled 
    INTO v_tokens, v_last_refilled 
    FROM public.rate_limits WHERE key = p_key FOR UPDATE;

    IF v_tokens IS NULL THEN
        INSERT INTO public.rate_limits (key, tokens, last_refilled)
        VALUES (p_key, p_limit - 1, v_now);
        v_tokens := p_limit - 1;
        v_last_refilled := v_now;
        v_allowed := true;
    ELSE
        IF v_now >= v_last_refilled + (p_window_ms || ' milliseconds')::interval THEN
            v_tokens := p_limit - 1;
            v_last_refilled := v_now;
            v_allowed := true;
        ELSIF v_tokens > 0 THEN
            v_tokens := v_tokens - 1;
            v_allowed := true;
        ELSE
            v_allowed := false;
        END IF;
        
        UPDATE public.rate_limits 
        SET tokens = v_tokens, last_refilled = v_last_refilled
        WHERE key = p_key;
    END IF;

    v_reset_time := v_last_refilled + (p_window_ms || ' milliseconds')::interval;
    
    RETURN json_build_object(
        'allowed', v_allowed,
        'remaining', v_tokens,
        'reset_time', v_reset_time
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
