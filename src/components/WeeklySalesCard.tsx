import { useMemo, useEffect, useState, useCallback } from 'react';
import { CalendarDays, Ticket, Users } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { DiceEventRaw } from '@/lib/ticket-utils';

interface WeeklySalesCardProps {
  events: DiceEventRaw[];
}

function isColorFestEvent(eventName: string): boolean {
  return /color\s*fest\s*\d/i.test(eventName);
}

function getPresenzeMultiplier(eventName: string): number {
  if (/2\s*days?/i.test(eventName)) return 2;
  if (/(abbonamento|full)/i.test(eventName) && !/1\s*day|one\s*day/i.test(eventName)) return 3;
  return 1;
}

interface WeeklyEventDetail {
  eventName: string;
  ticketsDelta: number;
  presenzeDelta: number;
}

export function WeeklySalesCard({ events }: WeeklySalesCardProps) {
  const [weeklyBiglietti, setWeeklyBiglietti] = useState<number | null>(null);
  const [weeklyPresenze, setWeeklyPresenze] = useState<number | null>(null);
  const [eventDetails, setEventDetails] = useState<WeeklyEventDetail[]>([]);
  const [eventCount, setEventCount] = useState(0);

  const today = new Date();
  const weekAgo = subDays(today, 7);
  const dateLabel = `${format(weekAgo, 'd MMM', { locale: it })} - ${format(today, 'd MMM', { locale: it })}`;

  const computeWeekly = useCallback(async () => {
    try {
      const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
      const weekAgoStr = subDays(today, 7).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });

      const { data: baselineSnapshots } = await supabase
        .from('ticket_snapshots')
        .select('event_id, event_name, tickets_sold')
        .lte('snapshot_date', weekAgoStr)
        .order('snapshot_date', { ascending: false })
        .limit(100);

      if (!baselineSnapshots || baselineSnapshots.length === 0) {
        setWeeklyBiglietti(null);
        setWeeklyPresenze(null);
        setEventDetails([]);
        return;
      }

      const baselineMap = new Map<string, { tickets_sold: number; event_name: string }>();
      for (const s of baselineSnapshots) {
        if (s.event_id && !baselineMap.has(s.event_id) && isColorFestEvent(s.event_name || '')) {
          baselineMap.set(s.event_id, { tickets_sold: s.tickets_sold, event_name: s.event_name || '' });
        }
      }

      const cfEvents = events.filter(e => isColorFestEvent(e.name));
      let totalBiglietti = 0;
      let totalPresenze = 0;
      const details: WeeklyEventDetail[] = [];
      let activeEvents = 0;

      for (const event of cfEvents) {
        const baseline = baselineMap.get(event.id);
        const baselineSold = baseline?.tickets_sold ?? 0;
        const delta = Math.max(0, event.ticketsSold - baselineSold);
        const multiplier = getPresenzeMultiplier(event.name);
        const presenzeDelta = delta * multiplier;
        totalBiglietti += delta;
        totalPresenze += presenzeDelta;

        if (delta > 0) activeEvents++;
        details.push({
          eventName: event.name,
          ticketsDelta: delta,
          presenzeDelta,
        });
      }

      details.sort((a, b) => b.ticketsDelta - a.ticketsDelta);

      setWeeklyBiglietti(totalBiglietti);
      setWeeklyPresenze(totalPresenze);
      setEventDetails(details);
      setEventCount(activeEvents);
    } catch (err) {
      console.error('Error computing weekly sales:', err);
    }
  }, [events]);

  useEffect(() => {
    if (events.length > 0) computeWeekly();
  }, [events, computeWeekly]);

  if (weeklyBiglietti === null) return null;

  return (
    <div className="soft-card-purple p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-foreground/5">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide">Ultima settimana</p>
            <p className="text-[10px] text-muted-foreground">{dateLabel}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center">
          <p className="text-xl font-extrabold font-mono">{eventCount}</p>
          <p className="text-[10px] text-muted-foreground">Eventi</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-extrabold font-mono">+{weeklyBiglietti.toLocaleString('it-IT')}</p>
          <p className="text-[10px] text-muted-foreground">Biglietti</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-extrabold font-mono">+{weeklyPresenze.toLocaleString('it-IT')}</p>
          <p className="text-[10px] text-muted-foreground">Presenze</p>
        </div>
      </div>

      {/* Per-event breakdown */}
      {eventDetails.length > 0 && (
        <div className="border-t border-foreground/10 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Dettaglio per tipo</p>
          <div className="space-y-1.5">
            {eventDetails.map((detail) => (
              <div key={detail.eventName} className="flex items-center justify-between text-xs">
                <span className="text-foreground/80 truncate mr-2">{detail.eventName}</span>
                <span className="font-mono font-semibold text-foreground/70 whitespace-nowrap">
                  +{detail.ticketsDelta} big. → {detail.presenzeDelta} pres.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
