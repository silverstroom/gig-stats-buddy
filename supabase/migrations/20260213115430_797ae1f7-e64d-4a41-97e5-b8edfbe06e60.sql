
-- Table to store historical ticket snapshots
CREATE TABLE public.ticket_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_id TEXT,
  event_name TEXT,
  ticket_type TEXT NOT NULL,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read for now, edge function writes via service role)
ALTER TABLE public.ticket_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read snapshots (dashboard is public)
CREATE POLICY "Anyone can read snapshots"
ON public.ticket_snapshots
FOR SELECT
USING (true);
