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
    // Fast start, slow middle, fast finish pattern
    const duration = 2400;
    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease: fast-slow-fast (cubic in-out style, capped at 95 until "done")
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

  const logoSize = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';
  const barWidth = size === 'sm' ? 'w-32' : 'w-48';

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <img
        src={logoBlack}
        alt="Loading"
        className={`${logoSize} object-contain animate-pulse drop-shadow-lg`}
      />
      <div className={barWidth}>
        <Progress value={progress} className="h-2 bg-muted/50" />
      </div>
      <span className="text-xs text-muted-foreground font-medium tabular-nums">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
