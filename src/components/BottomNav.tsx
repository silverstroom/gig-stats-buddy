import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Home, TrendingUp, Target, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/monitoraggio', label: 'Monitoraggio', icon: TrendingUp },
  { to: '/obiettivo', label: 'Obiettivo', icon: Target },
  { to: '/profilo', label: 'Profilo', icon: User },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-sm')} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn('text-[10px] font-medium', isActive && 'font-bold')}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-4 h-0.5 rounded-full bg-primary mt-0.5" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
