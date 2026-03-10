import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  maxPull?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80, resistance = 2.5, maxPull = 120 }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
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
    
    if (deltaY < 10 && !pullingRef.current) return;
    
    if (deltaY > 0) {
      pullingRef.current = true;
      e.preventDefault();
      // Rubber-band effect: diminishing returns as you pull further
      const dampened = Math.min(deltaY / resistance, maxPull);
      setPullDistance(dampened);
    }
  }, [isAtTop, isRefreshing, resistance, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) {
      startYRef.current = null;
      return;
    }

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(56); // Snap to spinner resting position
      try {
        await onRefresh();
      } finally {
        // Brief delay so user sees completion
        await new Promise(r => setTimeout(r, 300));
        setIsRefreshing(false);
        setIsSettling(true);
        setPullDistance(0);
        setTimeout(() => setIsSettling(false), 300);
      }
    } else {
      setIsSettling(true);
      setPullDistance(0);
      setTimeout(() => setIsSettling(false), 300);
    }

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

  return { pullDistance, isRefreshing, isSettling, progress, containerRef };
}
