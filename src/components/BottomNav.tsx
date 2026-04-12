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
    <>
      {/* SVG Filter for liquid glass effect */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="liquid-glass-nav">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <nav className="fixed bottom-4 left-4 right-4 z-50 safe-area-bottom">
        <div className="relative max-w-md mx-auto">
          {/* Liquid glass dock */}
          <div className="liquid-glass-dock flex items-center justify-around h-[64px] px-2 rounded-[2rem] relative overflow-hidden">
            {/* Glass refraction layers */}
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/60 to-white/20 dark:from-white/10 dark:to-white/5 pointer-events-none" />
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-primary/5 via-transparent to-primary/8 dark:from-primary/10 dark:to-primary/5 pointer-events-none" />
            <div className="absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/40 dark:border-white/10 pointer-events-none" />

            {/* Nav items */}
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => haptics.light()}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-2xl transition-all duration-300 relative z-10',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-500',
                      isActive && 'liquid-glass-icon-active'
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
        </div>
      </nav>
    </>
  );
}
