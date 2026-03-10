import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Home, TrendingUp, Target, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/monitoraggio', label: 'Monitor', icon: TrendingUp },
  { to: '/obiettivo', label: 'Goal', icon: Target },
  { to: '/profilo', label: 'Profilo', icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const haptics = useHaptics();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 safe-area-bottom">
      <div className="glass-nav flex items-center justify-around h-[64px] max-w-md mx-auto px-2 rounded-[1.75rem]">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => haptics.light()}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-2xl transition-all duration-300',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300',
                  isActive && 'bg-primary/12 shadow-[0_2px_12px_-2px_hsl(var(--primary)/0.3)]'
                )}
              >
                <Icon
                  className={cn('w-5 h-5 transition-transform duration-300', isActive && 'scale-110')}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span className={cn('text-[9px] font-medium transition-all', isActive && 'font-bold')}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
