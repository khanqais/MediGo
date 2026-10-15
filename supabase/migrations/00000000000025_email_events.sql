-- 00000000000025_email_events.sql
-- Transactional email event log with RLS restricted to service role only

CREATE TABLE IF NOT EXISTS public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    template TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'LOGGED')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups and reporting
CREATE INDEX IF NOT EXISTS idx_email_events_order_id ON public.email_events(order_id);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON public.email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON public.email_events(created_at);

-- Enable RLS: service role only
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_events FROM anon, authenticated, public;
GRANT ALL ON TABLE public.email_events TO service_role;
GRANT ALL ON TABLE public.email_events TO postgres;
