import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // px to pull before triggering (default 100)
  resistance?: number; // drag resistance factor (default 2.5)
}

export function usePullToRefresh({ onRefresh, threshold = 100, resistance = 2.5 }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isAtTop() || isRefreshing) return;
    startYRef.current = e.touches[0].clientY;
  }, [isAtTop, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null || isRefreshing) return;
    if (!isAtTop()) {
      startYRef.current = null;
      setPullDistance(0);
      pullingRef.current = false;
      return;
    }

    const deltaY = e.touches[0].clientY - startYRef.current;
    
    // Only activate on intentional downward pull (>15px initial threshold)
    if (deltaY < 15 && !pullingRef.current) return;
    
    if (deltaY > 0) {
      pullingRef.current = true;
      e.preventDefault(); // Prevent native scroll while pulling
      const dampened = Math.min(deltaY / resistance, threshold * 1.3);
      setPullDistance(dampened);
    }
  }, [isAtTop, isRefreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) {
      startYRef.current = null;
      return;
    }

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // Snap to loading position
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    startYRef.current = null;
    pullingRef.current = false;
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const el = containerRef.current || document;
    el.addEventListener('touchstart', handleTouchStart as any, { passive: true });
    el.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    el.addEventListener('touchend', handleTouchEnd as any, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart as any);
      el.removeEventListener('touchmove', handleTouchMove as any);
      el.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);

  return { pullDistance, isRefreshing, progress, containerRef };
}
