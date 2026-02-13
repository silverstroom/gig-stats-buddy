import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DayDistribution } from '@/lib/ticket-utils';

interface DayBarChartProps {
  distribution: DayDistribution[];
}

const COLORS = [
  'hsl(250, 85%, 60%)',
  'hsl(165, 80%, 40%)',
  'hsl(35, 95%, 55%)',
  'hsl(340, 80%, 55%)',
  'hsl(200, 80%, 50%)',
];

export function DayBarChart({ distribution }: DayBarChartProps) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="font-semibold text-lg mb-4">Distribuzione Presenze per Giorno</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 25%)" opacity={0.3} />
            <XAxis
              dataKey="day"
              tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 13, fontFamily: 'Space Grotesk' }}
              axisLine={{ stroke: 'hsl(220, 15%, 25%)' }}
            />
            <YAxis
              tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 12, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: 'hsl(220, 15%, 25%)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(225, 22%, 12%)',
                border: '1px solid hsl(225, 18%, 20%)',
                borderRadius: '8px',
                fontFamily: 'Space Grotesk',
                color: 'hsl(220, 15%, 92%)',
              }}
              formatter={(value: number) => [`${value} presenze`, '']}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={60}>
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
