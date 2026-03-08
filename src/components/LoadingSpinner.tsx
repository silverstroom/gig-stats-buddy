import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-8 h-8';
  const ringSize = size === 'sm' ? 'w-8 h-8' : 'w-14 h-14';

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Pulse ring */}
      <div className={`absolute ${ringSize} rounded-full bg-primary/20 animate-pulse-ring`} />
      {/* Second ring, delayed */}
      <div className={`absolute ${ringSize} rounded-full bg-primary/10 animate-pulse-ring`} style={{ animationDelay: '0.7s' }} />
      {/* Icon */}
      <RefreshCw className={`${iconSize} text-primary animate-spin-bounce drop-shadow-md`} />
    </div>
  );
}
