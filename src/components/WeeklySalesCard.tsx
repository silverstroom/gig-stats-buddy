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

export function WeeklySalesCard({ events }: WeeklySalesCardProps) {
  const [weeklyBiglietti, setWeeklyBiglietti] = useState<number | null>(null);
  const [weeklyPresenze, setWeeklyPresenze] = useState<number | null>(null);

  const today = new Date();
  const weekAgo = subDays(today, 7);
  const dateLabel = `${format(weekAgo, 'd MMM', { locale: it })} - ${format(today, 'd MMM', { locale: it })}`;

  const computeWeekly = useCallback(async () => {
    try {
      const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
      const weekAgoStr = subDays(today, 7).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
      const dayBeforeWeekAgo = format(subDays(new Date(weekAgoStr), 1), 'yyyy-MM-dd');

      // Get snapshot from ~7 days ago (baseline)
      const { data: baselineSnapshots } = await supabase
        .from('ticket_snapshots')
        .select('event_id, event_name, tickets_sold')
        .lte('snapshot_date', weekAgoStr)
        .order('snapshot_date', { ascending: false })
        .limit(100);

      if (!baselineSnapshots || baselineSnapshots.length === 0) {
        setWeeklyBiglietti(null);
        setWeeklyPresenze(null);
        return;
      }

      // Deduplicate: keep latest snapshot per event_id
      const baselineMap = new Map<string, { tickets_sold: number; event_name: string }>();
      for (const s of baselineSnapshots) {
        if (s.event_id && !baselineMap.has(s.event_id) && isColorFestEvent(s.event_name || '')) {
          baselineMap.set(s.event_id, { tickets_sold: s.tickets_sold, event_name: s.event_name || '' });
        }
      }

      // Compare with current live data
      const cfEvents = events.filter(e => isColorFestEvent(e.name));
      let totalBiglietti = 0;
      let totalPresenze = 0;

      for (const event of cfEvents) {
        const baseline = baselineMap.get(event.id);
        const baselineSold = baseline?.tickets_sold ?? 0;
        const delta = Math.max(0, event.ticketsSold - baselineSold);
        totalBiglietti += delta;
        totalPresenze += delta * getPresenzeMultiplier(event.name);
      }

      setWeeklyBiglietti(totalBiglietti);
      setWeeklyPresenze(totalPresenze);
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
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-foreground/5">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs font-bold">Ultima settimana</p>
          <p className="text-[10px] text-muted-foreground">{dateLabel}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          <div>
            <p className="text-lg font-extrabold font-mono text-primary">{weeklyBiglietti.toLocaleString('it-IT')}</p>
            <p className="text-[10px] text-muted-foreground">Biglietti venduti</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-secondary" />
          <div>
            <p className="text-lg font-extrabold font-mono text-secondary">{weeklyPresenze.toLocaleString('it-IT')}</p>
            <p className="text-[10px] text-muted-foreground">Presenze</p>
          </div>
        </div>
      </div>
    </div>
  );
}
