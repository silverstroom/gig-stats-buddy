import logoBlack from '@/assets/logo_black.png';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const logoSize = size === 'sm' ? 'w-8 h-8' : 'w-14 h-14';
  const ringSize = size === 'sm' ? 'w-12 h-12' : 'w-20 h-20';

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Pulse rings */}
      <div className={`absolute ${ringSize} rounded-full bg-primary/20 animate-pulse-ring`} />
      <div className={`absolute ${ringSize} rounded-full bg-secondary/15 animate-pulse-ring`} style={{ animationDelay: '0.7s' }} />
      {/* Logo */}
      <img
        src={logoBlack}
        alt="Loading"
        className={`${logoSize} object-contain animate-spin-bounce drop-shadow-lg`}
      />
    </div>
  );
}
