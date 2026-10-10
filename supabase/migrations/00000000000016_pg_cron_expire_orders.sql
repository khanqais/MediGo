-- pg_cron: expire unpaid online orders every 15 minutes
-- This runs entirely inside the database — no HTTP call needed.
-- Supabase Pro/Team enables pg_cron; on free tier this migration
-- will error (safe to skip — use GitHub Actions instead).

-- The SQL version of the expiry logic:
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_order IN
        SELECT id, status
        FROM public.orders
        WHERE payment_method = 'ONLINE'
          AND payment_status IN ('PENDING', 'FAILED')
          AND status = 'PENDING'
          AND created_at < NOW() - INTERVAL '30 minutes'
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Use the atomic status update function
        PERFORM public.process_order_status_update(
            v_order.id,
            v_order.status,
            'CANCELLED',
            NULL,
            NULL,
            'Auto-cancelled: unpaid online order expired after 30 minutes',
            NULL,
            FALSE
        );
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

-- Schedule with pg_cron (if extension is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        PERFORM cron.schedule(
            'expire-unpaid-orders',
            '*/15 * * * *',
            'SELECT public.expire_unpaid_orders()'
        );
        RAISE NOTICE 'pg_cron job scheduled: expire-unpaid-orders every 15 minutes';
    ELSE
        RAISE NOTICE 'pg_cron not available — use GitHub Actions or Vercel cron instead';
    END IF;
END;
$$;
