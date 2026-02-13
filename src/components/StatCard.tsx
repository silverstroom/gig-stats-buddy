import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  colorClass?: string;
}

export function StatCard({ title, value, subtitle, icon, colorClass = 'text-primary' }: StatCardProps) {
  return (
    <div className="glass-card stat-glow rounded-xl p-6 transition-transform hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={`text-3xl font-bold font-mono mt-2 ${colorClass}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg bg-primary/10 ${colorClass}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
