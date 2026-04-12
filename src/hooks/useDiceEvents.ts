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

    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 20000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const invokePromise = supabase.functions.invoke('dice-events', {
          body: { action: 'fetch_events' },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout nel caricamento dati live')), TIMEOUT_MS)
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
        setSnapshots({
          todayBaseline: data.todayBaseline || null,
          yesterdayBaseline: data.yesterdayBaseline || null,
        });
        setError(null);
        break; // Success, exit retry loop
      } catch (err) {
        console.warn(`Fetch attempt ${attempt}/${MAX_RETRIES} failed:`, err);
        if (attempt === MAX_RETRIES) {
          console.error('All fetch attempts failed:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        } else {
          // Exponential backoff: 1s, 2s
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }

    inFlightRef.current = false;
    setLoading(false);
  }, []);

  return { events, loading, error, fetchEvents, snapshots };
}
