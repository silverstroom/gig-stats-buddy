-- Add unique constraint for daily snapshots per event
ALTER TABLE public.ticket_snapshots
ADD CONSTRAINT ticket_snapshots_event_id_snapshot_date_key UNIQUE (event_id, snapshot_date);