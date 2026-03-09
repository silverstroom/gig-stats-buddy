import { useState, useEffect, useRef } from 'react';
import logoBlack from '@/assets/logo_black.png';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

const STEPS = [
  { label: 'Connessione al server...', icon: '🔗' },
  { label: 'Autenticazione API...', icon: '🔐' },
  { label: 'Recupero biglietti...', icon: '🎫' },
  { label: 'Sincronizzazione dati...', icon: '📊' },
  { label: 'Finalizzazione...', icon: '✅' },
];

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState('');
  const startRef = useRef(Date.now());

  // Progress bar animation
  useEffect(() => {
    const duration = 3200;
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      // Ease with stair-step feel: fast bursts then pauses at step boundaries
      const stepProgress = currentStep / STEPS.length;
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const value = Math.min(eased * 100, 96);
      setProgress(value);
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, []);

  // Step progression
  useEffect(() => {
    const stepDuration = 650;
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, stepDuration);
    return () => clearInterval(interval);
  }, []);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const logoSize = size === 'sm' ? 'w-10 h-10' : 'w-16 h-16 sm:w-20 sm:h-20';

  return (
    <div className={`relative flex flex-col items-center gap-4 sm:gap-5 py-6 ${className}`}>
      {/* Pulsing ring + logo */}
      <div className="relative">
        <div className="loading-ring absolute inset-[-12px] sm:inset-[-16px] rounded-full border-2 border-primary/30" />
        <div className="loading-ring-inner absolute inset-[-6px] sm:inset-[-8px] rounded-full border border-primary/15" />
        <img
          src={logoBlack}
          alt="Loading"
          className={`${logoSize} object-contain drop-shadow-lg dark:invert relative z-10`}
          style={{ animation: 'logoPulse 1.2s ease-in-out infinite' }}
        />
        {/* Orbiting dot */}
        <div className="loading-orbit absolute inset-[-14px] sm:inset-[-18px]">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] absolute top-0 left-1/2 -translate-x-1/2" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-48 sm:w-56 relative">
        <div className="h-1.5 sm:h-2 rounded-full bg-muted/40 overflow-hidden backdrop-blur-sm">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-300 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 loading-shimmer" />
          </div>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-mono text-center mt-2 tabular-nums">
          {Math.round(progress)}%
        </p>
      </div>

      {/* Steps log */}
      <div className="flex flex-col items-center gap-1.5 min-h-[100px]">
        {STEPS.map((step, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          const isHidden = i > currentStep;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs sm:text-sm transition-all duration-300 ${
                isHidden ? 'opacity-0 translate-y-2' : ''
              } ${isDone ? 'opacity-40' : ''} ${isActive ? 'opacity-100 font-semibold' : ''}`}
              style={{
                animation: isActive ? 'stepFadeIn 0.3s ease-out' : undefined,
              }}
            >
              <span className={`text-sm ${isDone ? 'grayscale' : ''}`}>
                {isDone ? '✓' : step.icon}
              </span>
              <span className={`${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {step.label}
                {isActive && <span className="inline-block w-6 text-left">{dots}</span>}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes logoPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }

        .loading-ring {
          animation: ringPulse 2s ease-in-out infinite;
        }
        .loading-ring-inner {
          animation: ringPulse 2s ease-in-out infinite 0.3s;
        }
        @keyframes ringPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.06); }
        }

        .loading-orbit {
          animation: orbit 2s linear infinite;
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loading-shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary-foreground) / 0.3) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes stepFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
