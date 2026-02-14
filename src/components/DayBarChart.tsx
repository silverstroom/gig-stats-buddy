import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { DayDistribution } from '@/lib/ticket-utils';

interface DayBarChartProps {
  distribution: DayDistribution[];
}

const SOLD_COLORS = [
'hsl(220, 100%, 55%)',
'hsl(42, 100%, 50%)',
'hsl(280, 80%, 55%)'];


const REMAINING_COLOR = 'hsl(220, 10%, 20%)';

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
      // Merge: keep stored values, add defaults for new days
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
    <div className="glass-card rounded-2xl p-6 bg-[#fed26c]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-lg">Distribuzione Presenze per Giorno</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">

          <Settings2 className="w-4 h-4" />
          {editing ? 'Chiudi' : 'Imposta capacità'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-6">Biglietti venduti vs capacità massima per giorno</p>

      {editing &&
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-muted/30 border border-border/50">
          {distribution.map((d) =>
        <div key={d.date} className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap min-w-[50px]">
                {d.day}
              </label>
              <Input
            type="number"
            min={1}
            value={capacities[d.date] || 2000}
            onChange={(e) => updateCapacity(d.date, parseInt(e.target.value) || 1)}
            className="h-8 text-sm font-mono" />

            </div>
        )}
        </div>
      }

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {distribution.map((d, i) => {
          const cap = capacities[d.date] || 2000;
          const sold = d.count;
          const remaining = Math.max(0, cap - sold);
          const pct = Math.min(100, Math.round(sold / cap * 100));

          const pieData = [
          { name: 'Venduti', value: sold },
          { name: 'Rimanenti', value: remaining }];


          return (
            <div key={d.date} className="flex flex-col items-center text-primary-foreground">
              <p className="text-sm font-bold mb-2">{d.day}</p>
              <div className="h-[180px] w-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none">

                      <Cell fill={SOLD_COLORS[i % SOLD_COLORS.length]} />
                      <Cell fill={REMAINING_COLOR} />
                      <Label
                        value={`${pct}%`}
                        position="center"
                        style={{
                          fill: 'hsl(45, 20%, 95%)',
                          fontSize: '22px',
                          fontWeight: 800,
                          fontFamily: 'JetBrains Mono'
                        }} />

                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                <span className="text-foreground font-bold">{sold.toLocaleString('it-IT')}</span>
                {' / '}
                {cap.toLocaleString('it-IT')}
              </p>
            </div>);

        })}
      </div>
    </div>);

}