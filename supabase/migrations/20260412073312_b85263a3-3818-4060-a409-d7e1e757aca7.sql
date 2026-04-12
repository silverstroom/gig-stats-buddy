
CREATE TABLE public.dice_cache (
  cache_key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dice_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read (no auth needed for this dashboard)
CREATE POLICY "Cache is publicly readable"
  ON public.dice_cache
  FOR SELECT
  USING (true);
