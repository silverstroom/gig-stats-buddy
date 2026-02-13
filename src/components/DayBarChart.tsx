import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { DayDistribution } from '@/lib/ticket-utils';

interface DayBarChartProps {
  distribution: DayDistribution[];
}

const COLORS = [
  'hsl(220, 100%, 55%)',
  'hsl(42, 100%, 50%)',
  'hsl(0, 0%, 80%)',
  'hsl(200, 80%, 55%)',
  'hsl(30, 90%, 55%)',
];

export function DayBarChart({ distribution }: DayBarChartProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="font-bold text-lg mb-1">Distribuzione Presenze per Giorno</h3>
      <p className="text-xs text-muted-foreground mb-6">Presenze stimate per ogni giorno del festival</p>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 25%)" opacity={0.2} />
            <XAxis
              dataKey="day"
              tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 13, fontWeight: 600, fontFamily: 'Space Grotesk' }}
              axisLine={{ stroke: 'hsl(220, 15%, 20%)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(220, 12%, 55%)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 28%, 10%)',
                border: '1px solid hsl(222, 20%, 18%)',
                borderRadius: '12px',
                fontFamily: 'Space Grotesk',
                color: 'hsl(45, 20%, 95%)',
                padding: '12px 16px',
              }}
              formatter={(value: number) => [`${value.toLocaleString('it-IT')} presenze`, '']}
              cursor={{ fill: 'hsl(220, 100%, 55%, 0.08)' }}
            />
            <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={70}>
              <LabelList
                dataKey="count"
                position="top"
                style={{ fill: 'hsl(220, 12%, 55%)', fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono' }}
                formatter={(v: number) => v.toLocaleString('it-IT')}
              />
              {distribution.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
