import { useState, useCallback, useRef, useEffect } from 'react';
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

function parseEventsFromResponse(data: any): DiceEventRaw[] {
  const eventsData = data?.data?.viewer?.events?.edges || [];
  return eventsData
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
}

export function useDiceEvents() {
  const [events, setEvents] = useState<DiceEventRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotData>({
    todayBaseline: null,
    yesterdayBaseline: null,
  });
  const [isCachedData, setIsCachedData] = useState(false);
  const inFlightRef = useRef(false);
  const cacheLoadedRef = useRef(false);
  const hasDataRef = useRef(false);

  // Load cached data instantly on mount
  useEffect(() => {
    if (cacheLoadedRef.current) return;
    cacheLoadedRef.current = true;

    (async () => {
      try {
        const { data: cacheRow } = await supabase
          .from('dice_cache')
          .select('data, updated_at')
          .eq('cache_key', 'events')
          .maybeSingle();

        if (cacheRow?.data) {
          const cached = cacheRow.data as any;
          const parsed = parseEventsFromResponse(cached);
          if (parsed.length > 0) {
            setEvents(parsed);
            setSnapshots({
              todayBaseline: cached.todayBaseline || null,
              yesterdayBaseline: cached.yesterdayBaseline || null,
            });
            setIsCachedData(true);
            hasDataRef.current = true;
          }
        }
      } catch (err) {
        console.warn('Cache load failed (non-blocking):', err);
      }
    })();
  }, []);

  const fetchEvents = useCallback(async () => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    if (!hasDataRef.current) {
      setLoading(true);
    }
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

        const parsed = parseEventsFromResponse(data);

        setEvents(parsed);
        setSnapshots({
          todayBaseline: data.todayBaseline || null,
          yesterdayBaseline: data.yesterdayBaseline || null,
        });
        setIsCachedData(false);
        hasDataRef.current = true;
        setError(null);
        break;
      } catch (err) {
        console.warn(`Fetch attempt ${attempt}/${MAX_RETRIES} failed:`, err);
        if (attempt === MAX_RETRIES) {
          console.error('All fetch attempts failed:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        } else {
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }

    inFlightRef.current = false;
    setLoading(false);
  }, []);

  return { events, loading, error, fetchEvents, snapshots, isCachedData };
}
