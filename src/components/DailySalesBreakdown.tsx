import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingBag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DailySalesDetail } from '@/lib/ticket-utils';

interface Props {
  breakdown: DailySalesDetail[];
}

const PIE_COLORS = [
  'hsl(220, 100%, 55%)',
  'hsl(42, 100%, 50%)',
  'hsl(280, 80%, 55%)',
  'hsl(160, 70%, 45%)',
  'hsl(350, 80%, 55%)',
  'hsl(30, 90%, 55%)',
  'hsl(190, 80%, 50%)',
];

function DayChart({ day }: { day: DailySalesDetail }) {
  const data = day.events.map((ev) => ({
    name: ev.eventName,
    value: ev.sold,
  }));

  if (data.length === 0) return null;

  return (
    <div className="flex items-center gap-4">
      <div className="w-[160px] h-[160px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [value.toLocaleString('it-IT'), 'Venduti']}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="text-muted-foreground truncate">{item.name}</span>
            <span className="font-mono font-semibold text-foreground ml-auto whitespace-nowrap">
              {item.value.toLocaleString('it-IT')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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
      <CardContent className="space-y-6">
        {breakdown.map((day, idx) => (
          <div key={day.date}>
            <h4 className="text-sm font-semibold mb-2 text-foreground">
              {day.day}{' '}
              <span className="text-muted-foreground font-normal">
                — {day.total.toLocaleString('it-IT')} presenze
              </span>
            </h4>

            {/* Chart */}
            <DayChart day={day} />

            {/* Table */}
            <div className="rounded-lg border overflow-hidden mt-2">
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
