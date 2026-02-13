import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingBag } from 'lucide-react';
import type { DailySalesDetail } from '@/lib/ticket-utils';

interface Props {
  breakdown: DailySalesDetail[];
}

export function DailySalesBreakdown({ breakdown }: Props) {
  if (breakdown.length === 0) return null;

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <ShoppingBag className="w-5 h-5 text-primary" />
          Dettaglio vendite giornaliere
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Quanti biglietti sono stati venduti ogni giorno e per cosa
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {breakdown.map((day) => (
          <div key={day.date}>
            <h4 className="text-sm font-semibold mb-1 text-foreground">
              {day.day}{' '}
              <span className="text-muted-foreground font-normal">
                — {day.total.toLocaleString('it-IT')} presenze
              </span>
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Evento / Biglietto</TableHead>
                    <TableHead className="text-xs text-right w-24">Venduti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {day.events.map((ev, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1.5">{ev.eventName}</TableCell>
                      <TableCell className="text-xs text-right font-medium py-1.5">
                        {ev.sold.toLocaleString('it-IT')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
