import { CoreSpinLoader } from '@/components/ui/core-spin-loader';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function LoadingSpinner({ className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center py-6 ${className}`}>
      <CoreSpinLoader />
    </div>
  );
}
