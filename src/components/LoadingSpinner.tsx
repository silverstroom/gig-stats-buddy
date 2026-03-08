import { useState, useEffect } from 'react';
import logoBlack from '@/assets/logo_black.png';
import { Progress } from '@/components/ui/progress';
import { Music, Music2, Music3, Music4 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

const floatingNotes = [
  { Icon: Music, delay: '0s', duration: '2.5s', left: '10%' },
  { Icon: Music2, delay: '0.4s', duration: '3s', left: '25%' },
  { Icon: Music3, delay: '0.8s', duration: '2.8s', left: '70%' },
  { Icon: Music4, delay: '1.2s', duration: '2.6s', left: '85%' },
  { Icon: Music, delay: '1.6s', duration: '3.2s', left: '45%' },
  { Icon: Music2, delay: '0.2s', duration: '2.9s', left: '55%' },
];

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
      {/* Floating music notes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingNotes.map((note, i) => (
          <note.Icon
            key={i}
            className="absolute text-primary/30 animate-bounce"
            size={size === 'sm' ? 14 : 18}
            style={{
              left: note.left,
              bottom: '-10%',
              animationDelay: note.delay,
              animationDuration: note.duration,
              animation: `floatUp ${note.duration} ${note.delay} ease-out infinite`,
            }}
          />
        ))}
      </div>

      <img
        src={logoBlack}
        alt="Loading"
        className={`${logoSize} object-contain animate-pulse drop-shadow-lg`}
      />

      {/* Equalizer bars */}
      <div className="flex items-end gap-1 h-6 sm:h-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1 sm:w-1.5 bg-primary/60 rounded-full"
            style={{
              animation: `eqBar 0.8s ${i * 0.15}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      <div className={`${barWidth} flex flex-col items-center gap-2`}>
        <Progress value={progress} className="h-2.5 sm:h-3 bg-muted/50 w-full" />
        <span className="text-sm sm:text-base text-muted-foreground font-semibold tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.7; }
          80% { opacity: 0.4; }
          100% { transform: translateY(-180px) rotate(20deg); opacity: 0; }
        }
        @keyframes eqBar {
          0% { height: 4px; }
          100% { height: 24px; }
        }
        @media (min-width: 640px) {
          @keyframes eqBar {
            0% { height: 6px; }
            100% { height: 32px; }
          }
        }
      `}</style>
    </div>
  );
}
