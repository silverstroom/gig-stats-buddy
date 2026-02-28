import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DiceEventRaw } from '@/lib/ticket-utils';

export interface SnapshotEntry {
  event_id: string;
  event_name: string;
  tickets_sold: number;
}

export interface SnapshotData {
  todayBaseline: SnapshotEntry[] | null;
  yesterdayBaseline: SnapshotEntry[] | null;
}

export function useDiceEvents() {
  const [events, setEvents] = useState<DiceEventRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotData>({
    todayBaseline: null,
    yesterdayBaseline: null,
  });
  const inFlightRef = useRef(false);

  const fetchEvents = useCallback(async () => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const invokePromise = supabase.functions.invoke('dice-events', {
        body: { action: 'fetch_events' },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout nel caricamento dati live')), 15000)
      );

      const { data, error: fnError } = await Promise.race([invokePromise, timeoutPromise]) as any;

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch events');

      const eventsData = data.data?.data?.viewer?.events?.edges || [];
      const parsed: DiceEventRaw[] = eventsData
        .filter((edge: any) => edge.node.state !== 'CANCELLED')
        .map((edge: any) => {
          const node = edge.node;
          return {
            id: node.id,
            name: node.name,
            state: node.state,
            startDatetime: node.startDatetime,
            endDatetime: node.endDatetime,
            ticketTypes: node.ticketTypes || [],
            ticketsSold: node.tickets?.totalCount || 0,
          };
        });

      setEvents(parsed);

      // Snapshots are returned inline from fetch_events
      setSnapshots({
        todayBaseline: data.todayBaseline || null,
        yesterdayBaseline: data.yesterdayBaseline || null,
      });
    } catch (err) {
      console.error('Error fetching DICE events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  return { events, loading, error, fetchEvents, snapshots };
}
