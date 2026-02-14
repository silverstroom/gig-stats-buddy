import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DiceEventRaw } from '@/lib/ticket-utils';

export interface SnapshotEntry {
  event_id: string;
  event_name: string;
  tickets_sold: number;
}

export interface SnapshotData {
  yesterday: SnapshotEntry[] | null;
  yesterdayDate: string | null;
  dayBefore: SnapshotEntry[] | null;
  dayBeforeDate: string | null;
}

export function useDiceEvents() {
  const [events, setEvents] = useState<DiceEventRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotData>({
    yesterday: null, yesterdayDate: null,
    dayBefore: null, dayBeforeDate: null,
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('dice-events', {
        body: { action: 'fetch_events' },
      });

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

      // Fetch previous snapshots (yesterday + day before)
      try {
        const { data: snapData } = await supabase.functions.invoke('dice-events', {
          body: { action: 'get_previous_snapshots' },
        });
        if (snapData?.success) {
          setSnapshots({
            yesterday: snapData.yesterday || null,
            yesterdayDate: snapData.yesterday_date || null,
            dayBefore: snapData.dayBefore || null,
            dayBeforeDate: snapData.dayBefore_date || null,
          });
        }
      } catch {
        console.error('Could not fetch previous snapshots');
      }
    } catch (err) {
      console.error('Error fetching DICE events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, fetchEvents, snapshots };
}
