import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Home, TrendingUp, Target, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/monitoraggio', label: 'Monitor', icon: TrendingUp },
  { to: '/obiettivo', label: 'Goal', icon: Target },
  { to: '/profilo', label: 'Profilo', icon: User },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-3 bg-foreground/90 backdrop-blur-xl rounded-[2rem] shadow-lg">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-2xl transition-all duration-200',
                isActive
                  ? 'text-background'
                  : 'text-background/50 hover:text-background/70'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200',
                isActive && 'bg-background/15'
              )}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={cn('text-[9px] font-medium', isActive && 'font-bold')}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
