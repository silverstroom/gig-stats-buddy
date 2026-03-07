import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TodaySalesEventDetail } from '@/lib/ticket-utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  colorClass?: string;
  cardStyle?: string;
  todaySales?: { soldToday: number; soldYesterday: number } | null;
  todayBreakdown?: TodaySalesEventDetail[];
  todayLabel?: string;
  glowClass?: string;
}

const CARD_STYLES = [
  'soft-card-blue',
  'soft-card-yellow',
  'soft-card-orange',
  'soft-card-mint',
  'soft-card-pink',
  'soft-card-purple',
];

export function StatCard({ title, value, subtitle, icon, colorClass = 'text-primary', cardStyle, todaySales, todayBreakdown, todayLabel, glowClass }: StatCardProps) {
  const pctChange = todaySales && todaySales.soldYesterday > 0
    ? Math.round(((todaySales.soldToday - todaySales.soldYesterday) / todaySales.soldYesterday) * 100)
    : null;

  return (
    <div className={`${cardStyle || 'soft-card'} p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={`text-3xl font-extrabold font-mono tracking-tight ${colorClass}`}>
            {typeof value === 'number' ? value.toLocaleString('it-IT') : value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-2xl bg-foreground/5 ${colorClass}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Today sales badge */}
      {todaySales !== null && todaySales !== undefined && (
        <div className="mt-3 pt-3 border-t border-foreground/5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {todayLabel || 'Venduti oggi'}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold font-mono text-primary">
                +{todaySales.soldToday.toLocaleString('it-IT')}
              </span>
              {pctChange !== null && (
                <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  pctChange > 0
                    ? 'bg-green-500/10 text-green-600'
                    : pctChange < 0
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-muted text-muted-foreground'
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
