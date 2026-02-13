import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DiceEventRaw } from '@/lib/ticket-utils';

export function useDiceEvents() {
  const [events, setEvents] = useState<DiceEventRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('dice-events', {
        body: { action: 'fetch_events' },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch events');
      }

      const eventsData = data.data?.data?.viewer?.events?.edges || [];
      const parsed: DiceEventRaw[] = eventsData.map((edge: any) => {
        const node = edge.node;
        return {
          id: node.id,
          name: node.name,
          startDatetime: node.startDatetime,
          endDatetime: node.endDatetime,
          ticketTypes: node.ticketTypes || [],
          ticketsSold: node.tickets?.totalCount || 0,
        };
      });

      setEvents(parsed);
    } catch (err) {
      console.error('Error fetching DICE events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, fetchEvents };
}
