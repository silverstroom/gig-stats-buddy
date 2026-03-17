import { ReactNode, useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TodaySalesEventDetail } from '@/lib/ticket-utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  note?: string;
  icon?: ReactNode;
  colorClass?: string;
  cardStyle?: string;
  todaySales?: { soldToday: number; soldYesterday: number } | null;
  todayBreakdown?: TodaySalesEventDetail[];
  todayLabel?: string;
  glowClass?: string;
}

function useAnimatedNumber(target: number, duration = 900) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const from = prevRef.current;
    if (from === target) return;

    setFlash(true);
    const diff = target - from;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(from + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
        setTimeout(() => setFlash(false), 600);
      }
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return { display, flash };
}

export function StatCard({ title, value, subtitle, icon, colorClass = 'text-primary', cardStyle, todaySales, todayBreakdown, todayLabel, glowClass }: StatCardProps) {
  const pctChange = todaySales && todaySales.soldYesterday > 0
    ? Math.round(((todaySales.soldToday - todaySales.soldYesterday) / todaySales.soldYesterday) * 100)
    : null;

  const isNumeric = typeof value === 'number';
  const { display, flash } = useAnimatedNumber(isNumeric ? value : 0);

  return (
    <div className={`${cardStyle || 'glass'} p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] relative overflow-hidden`}>
      {/* Flash overlay on update */}
      <div
        className={`absolute inset-0 rounded-[var(--radius)] pointer-events-none transition-opacity duration-700 ${
          flash ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'radial-gradient(ellipse at 30% 50%, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
        }}
      />

      <div className="flex items-start justify-between relative">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight transition-transform duration-300 ${colorClass} ${flash ? 'scale-110' : 'scale-100'}`}
             style={{ transformOrigin: 'left center' }}>
            {isNumeric ? display.toLocaleString('it-IT') : value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
          )}
          {note && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic leading-tight">{note}</p>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-2xl bg-foreground/[0.04] backdrop-blur-sm ${colorClass} transition-transform duration-500 ${flash ? 'scale-125 rotate-12' : 'scale-100 rotate-0'}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Today sales badge */}
      {todaySales !== null && todaySales !== undefined && (
        <div className="mt-3 pt-3 border-t border-foreground/[0.06] relative">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {todayLabel || 'Venduti oggi'}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold font-mono text-primary">
                +{todaySales.soldToday.toLocaleString('it-IT')}
              </span>
              {pctChange !== null && (
                <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${
                  pctChange > 0
                    ? 'bg-green-500/10 text-green-600'
                    : pctChange < 0
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-muted/50 text-muted-foreground'
                }`}>
                  {pctChange > 0 ? <TrendingUp className="w-3 h-3" /> : pctChange < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {pctChange > 0 ? '+' : ''}{pctChange}%
                </span>
              )}
            </div>
          </div>

          {/* Breakdown detail */}
          {todayBreakdown && todayBreakdown.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {todayBreakdown.map((item) => (
                <div key={item.eventName} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground truncate mr-2">{item.eventName}</span>
                  <span className="font-mono font-semibold text-foreground whitespace-nowrap">+{item.soldToday}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
