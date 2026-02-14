-- Add unique constraint so upsert with ignoreDuplicates works correctly
-- This ensures only the first snapshot of each day per event is kept as baseline
ALTER TABLE public.ticket_snapshots 
ADD CONSTRAINT ticket_snapshots_event_date_type_unique 
UNIQUE (event_id, snapshot_date, ticket_type);