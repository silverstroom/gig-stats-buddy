import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DailySalesDetail } from '@/lib/ticket-utils';

interface Props {
  breakdown: DailySalesDetail[];
}

const DAY_COLORS = ['hsl(220, 100%, 55%)', 'hsl(42, 100%, 50%)', 'hsl(280, 80%, 55%)'];

function DayChart({ day, colorIndex }: { day: DailySalesDetail; colorIndex: number }) {
  const data = day.events.map((ev) => ({
    name: ev.eventName.length > 25 ? ev.eventName.slice(0, 25) + '…' : ev.eventName,
    fullName: ev.eventName,
    venduti: ev.sold,
  }));

  if (data.length === 0) return null;

  const barColor = DAY_COLORS[colorIndex % DAY_COLORS.length];
  const chartHeight = Math.max(120, data.length * 36 + 20);

  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number) => [value.toLocaleString('it-IT'), 'Venduti']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="venduti" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={barColor} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
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
            <DayChart day={day} colorIndex={idx} />

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
