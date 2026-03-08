import { useState, useEffect } from 'react';
import logoBlack from '@/assets/logo_black.png';
import { Progress } from '@/components/ui/progress';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2400;
    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const value = Math.min(eased * 100, 95);
      setProgress(value);
      if (t < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, []);

  const logoSize = size === 'sm' ? 'w-12 h-12' : 'w-20 h-20 sm:w-24 sm:h-24';
  const barWidth = size === 'sm' ? 'w-40' : 'w-56 sm:w-64';

  return (
    <div className={`relative flex flex-col items-center gap-5 sm:gap-6 py-4 ${className}`}>
      <img
        src={logoBlack}
        alt="Loading"
        className={`${logoSize} object-contain drop-shadow-lg dark:invert`}
        style={{ animation: 'rockPulse 0.6s ease-in-out infinite alternate' }}
      />

      {/* Equalizer bars */}
      <div className="flex items-end gap-1 h-7 sm:h-9">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="w-1.5 sm:w-2 bg-primary/70 rounded-sm"
            style={{
              animation: `eqBar ${0.3 + (i % 3) * 0.15}s ${i * 0.08}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      <div className={`${barWidth} flex flex-col items-center gap-2`}>
        <Progress value={progress} className="h-2.5 sm:h-3 bg-muted/50 w-full" />
        <span className="text-sm sm:text-base text-muted-foreground font-semibold tabular-nums tracking-wide uppercase">
          {Math.round(progress)}%
        </span>
      </div>

      <style>{`
        @keyframes rockPulse {
          0% { transform: scale(0.97); }
          100% { transform: scale(1.03); }
        }
        @keyframes eqBar {
          0% { height: 4px; }
          100% { height: 28px; }
        }
        @media (min-width: 640px) {
          @keyframes eqBar {
            0% { height: 6px; }
            100% { height: 36px; }
          }
        }
      `}</style>
    </div>
  );
}
