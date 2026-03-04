import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingBag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DailySalesDetail } from '@/lib/ticket-utils';

interface Props {
  breakdown: DailySalesDetail[];
}

const PIE_COLORS = [
  'hsl(220, 90%, 55%)',
  'hsl(42, 95%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(350, 75%, 55%)',
  'hsl(30, 90%, 55%)',
  'hsl(190, 70%, 50%)',
];

function DayChart({ day }: { day: DailySalesDetail }) {
  const data = day.events.map((ev) => ({
    name: ev.eventName,
    value: ev.sold,
  }));

  if (data.length === 0) return null;

  return (
    <div className="flex items-center gap-4">
      <div className="w-[140px] h-[140px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={62}
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
                borderRadius: '16px',
                fontSize: '11px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
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
    <div className="soft-card">
      <div className="p-5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base">Dettaglio vendite giornaliere</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Biglietti venduti ogni giorno e per cosa
        </p>
      </div>
      <div className="p-5 space-y-6">
        {breakdown.map((day) => (
          <div key={day.date}>
            <h4 className="text-sm font-semibold mb-2">
              {day.day}{' '}
              <span className="text-muted-foreground font-normal">
                — {day.total.toLocaleString('it-IT')} presenze
              </span>
            </h4>
            <DayChart day={day} />

            <div className="rounded-2xl border border-border/30 overflow-hidden mt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Evento / Biglietto</TableHead>
                    <TableHead className="text-[10px] text-right w-20">Venduti</TableHead>
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
      </div>
    </div>
  );
}
