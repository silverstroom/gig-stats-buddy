import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { DayDistribution } from '@/lib/ticket-utils';

interface DayBarChartProps {
  distribution: DayDistribution[];
}

const SOLD_COLORS = [
  'hsl(220, 90%, 55%)',
  'hsl(42, 95%, 55%)',
  'hsl(280, 60%, 55%)',
];

const REMAINING_COLOR = 'hsl(40, 20%, 88%)';

function getStoredCapacities(days: string[]): Record<string, number> {
  try {
    const stored = localStorage.getItem('day-capacities');
    if (stored) return JSON.parse(stored);
  } catch {}
  const defaults: Record<string, number> = {};
  for (const d of days) defaults[d] = 2000;
  return defaults;
}

function saveCapacities(caps: Record<string, number>) {
  localStorage.setItem('day-capacities', JSON.stringify(caps));
}

export function DayBarChart({ distribution }: DayBarChartProps) {
  const [editing, setEditing] = useState(false);
  const [capacities, setCapacities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (distribution.length > 0) {
      const stored = getStoredCapacities(distribution.map((d) => d.date));
      const merged = { ...Object.fromEntries(distribution.map((d) => [d.date, 2000])), ...stored };
      setCapacities(merged);
    }
  }, [distribution]);

  const updateCapacity = (date: string, value: number) => {
    const next = { ...capacities, [date]: value };
    setCapacities(next);
    saveCapacities(next);
  };

  return (
    <div className="soft-card-yellow p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-base">Distribuzione Presenze</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="w-4 h-4" />
          {editing ? 'Chiudi' : 'Capacità'}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-5">Venduti vs capacità massima</p>

      {editing && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-3 rounded-2xl bg-background/50">
          {distribution.map((d) => (
            <div key={d.date} className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap min-w-[50px]">
                {d.day}
              </label>
              <Input
                type="number"
                min={1}
                value={capacities[d.date] || 2000}
                onChange={(e) => updateCapacity(d.date, parseInt(e.target.value) || 1)}
                className="h-8 text-sm font-mono rounded-xl"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {distribution.map((d, i) => {
          const cap = capacities[d.date] || 2000;
          const sold = d.count;
          const remaining = Math.max(0, cap - sold);
          const pct = Math.min(100, Math.round((sold / cap) * 100));

          const pieData = [
            { name: 'Venduti', value: sold },
            { name: 'Rimanenti', value: remaining },
          ];

          return (
            <div key={d.date} className="flex flex-col items-center">
              <p className="text-sm font-bold mb-2">{d.day}</p>
              <div className="h-[160px] w-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={72}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={SOLD_COLORS[i % SOLD_COLORS.length]} />
                      <Cell fill={REMAINING_COLOR} />
                      <Label
                        value={`${pct}%`}
                        position="center"
                        style={{
                          fill: 'hsl(220, 25%, 10%)',
                          fontSize: '20px',
                          fontWeight: 800,
                          fontFamily: 'JetBrains Mono',
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                <span className="font-bold text-foreground">{sold.toLocaleString('it-IT')}</span>
                {' / '}
                {cap.toLocaleString('it-IT')}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
