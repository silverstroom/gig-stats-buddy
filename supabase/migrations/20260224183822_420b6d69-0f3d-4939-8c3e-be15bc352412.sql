
-- Table to store daily presenze aggregated from historical CSV data
CREATE TABLE public.historical_daily_presenze (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_key TEXT NOT NULL,
  sale_date DATE NOT NULL,
  presenze_delta INTEGER NOT NULL DEFAULT 0,
  tickets_delta INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(edition_key, sale_date)
);

ALTER TABLE public.historical_daily_presenze ENABLE ROW LEVEL SECURITY;

-- Public read access for the monitoring page (no auth in this app)
CREATE POLICY "Anyone can read historical presenze"
  ON public.historical_daily_presenze
  FOR SELECT
  USING (true);
