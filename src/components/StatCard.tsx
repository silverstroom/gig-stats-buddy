import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  colorClass?: string;
  glowClass?: string;
  todaySales?: { soldToday: number; soldYesterday: number } | null;
}

export function StatCard({ title, value, subtitle, icon, colorClass = 'text-primary', glowClass = 'stat-glow', todaySales }: StatCardProps) {
  const pctChange = todaySales && todaySales.soldYesterday > 0
    ? Math.round(((todaySales.soldToday - todaySales.soldYesterday) / todaySales.soldYesterday) * 100)
    : null;

  return (
    <div className={`glass-card ${glowClass} rounded-2xl p-6 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
          <p className={`text-4xl font-extrabold font-mono tracking-tight ${colorClass}`}>
            {typeof value === 'number' ? value.toLocaleString('it-IT') : value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-xl bg-primary/10 ${colorClass}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Today sales badge */}
      {todaySales !== null && todaySales !== undefined && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Venduti oggi
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
        </div>
      )}
    </div>
  );
}
