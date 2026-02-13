import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  colorClass?: string;
  glowClass?: string;
}

export function StatCard({ title, value, subtitle, icon, colorClass = 'text-primary', glowClass = 'stat-glow' }: StatCardProps) {
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
    </div>
  );
}
