import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Minus } from 'lucide-react';
import type { DiceEventRaw } from '@/lib/ticket-utils';
import type { PreviousSnapshot } from '@/hooks/useDiceEvents';

interface Props {
  events: DiceEventRaw[];
  previousSnapshot: PreviousSnapshot[];
  snapshotDate: string;
}

export function TodaySales({ events, previousSnapshot, snapshotDate }: Props) {
  // Build a map of previous totals by event_id
  const prevMap = new Map<string, number>();
  for (const snap of previousSnapshot) {
    prevMap.set(snap.event_id, snap.tickets_sold);
  }

  // Calculate diffs
  const diffs: { name: string; current: number; previous: number; diff: number }[] = [];
  let totalDiff = 0;

  for (const event of events) {
    const prev = prevMap.get(event.id) ?? 0;
    const diff = event.ticketsSold - prev;
    if (diff > 0) {
      diffs.push({ name: event.name, current: event.ticketsSold, previous: prev, diff });
      totalDiff += diff;
    }
  }

  // Also count new events not in previous snapshot
  diffs.sort((a, b) => b.diff - a.diff);

  const snapLabel = new Date(snapshotDate + 'T12:00:00Z').toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <TrendingUp className="w-5 h-5 text-primary" />
          Venduti oggi
          <span className="ml-auto text-2xl font-extrabold font-mono text-primary">
            +{totalDiff.toLocaleString('it-IT')}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Rispetto allo snapshot del {snapLabel}
        </p>
      </CardHeader>
      {diffs.length > 0 ? (
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Evento</TableHead>
                  <TableHead className="text-xs text-right w-24">Venduti oggi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diffs.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5">{d.name}</TableCell>
                    <TableCell className="text-xs text-right font-semibold text-primary py-1.5">
                      +{d.diff.toLocaleString('it-IT')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      ) : (
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Minus className="w-4 h-4" />
            Nessuna vendita registrata oggi
          </div>
        </CardContent>
      )}
    </Card>
  );
}
