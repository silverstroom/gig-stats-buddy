import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TicketType } from '@/lib/ticket-utils';

interface DiceEvent {
  id: string;
  name: string;
  startDatetime: string;
  endDatetime: string;
  ticketTypes: TicketType[];
}

export function useDiceEvents() {
  const [events, setEvents] = useState<DiceEvent[]>([]);
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
      const parsed: DiceEvent[] = eventsData.map((edge: any) => {
        const node = edge.node;
        const ticketTypes: TicketType[] = (node.ticketTypes?.edges || []).map((te: any) => ({
          name: te.node.name,
          sold: te.node.soldCount || 0,
        }));

        return {
          id: node.id,
          name: node.name,
          startDatetime: node.startDatetime,
          endDatetime: node.endDatetime,
          ticketTypes,
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
