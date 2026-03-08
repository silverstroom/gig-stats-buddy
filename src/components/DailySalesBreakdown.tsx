import { useState } from 'react';
import { ShoppingBag, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DailySalesDetail } from '@/lib/ticket-utils';
import { cn } from '@/lib/utils';

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

function DayTab({ day, isActive, onClick }: { day: DailySalesDetail; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center px-4 py-2.5 rounded-2xl transition-all duration-200 min-w-[70px]',
        isActive
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.08]'
      )}
    >
      <span className="text-[11px] font-bold">{day.day}</span>
      <span className={cn('text-[10px] font-mono mt-0.5', isActive ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
        {day.total.toLocaleString('it-IT')}
      </span>
    </button>
  );
}

function DayContent({ day }: { day: DailySalesDetail }) {
  const data = day.events.map((ev) => ({
    name: ev.eventName,
    value: ev.sold,
  }));

  if (data.length === 0) return null;

  const maxSold = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Chart + legend row */}
      <div className="flex items-center gap-4">
        <div className="w-[120px] h-[120px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={54}
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
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="text-foreground/70 truncate flex-1">{item.name}</span>
              <span className="font-mono font-bold text-foreground whitespace-nowrap">
                {item.value.toLocaleString('it-IT')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar breakdown instead of table */}
      <div className="space-y-2">
        {data.map((item, i) => {
          const barWidth = Math.max(4, (item.value / maxSold) * 100);
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground/70 truncate mr-2">{item.name}</span>
                <span className="font-mono font-bold text-foreground">{item.value.toLocaleString('it-IT')}</span>
              </div>
              <div className="h-1.5 rounded-full bg-foreground/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    background: PIE_COLORS[i % PIE_COLORS.length],
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DailySalesBreakdown({ breakdown }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (breakdown.length === 0) return null;

  const activeDay = breakdown[activeIndex];

  return (
    <div className="soft-card">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base">Dettaglio vendite</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Biglietti venduti per giorno e tipologia
        </p>
      </div>

      {/* Day tabs */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {breakdown.map((day, i) => (
            <DayTab
              key={day.date}
              day={day}
              isActive={i === activeIndex}
              onClick={() => setActiveIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* Active day content */}
      <div className="px-5 pb-5">
        {activeDay && <DayContent day={activeDay} />}
      </div>
    </div>
  );
}
