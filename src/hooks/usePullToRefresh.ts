import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  maxPull?: number;
  /** Called at regular intervals during pull with current progress 0-1+ */
  onProgressTick?: (progress: number) => void;
  /** Called once when progress crosses 1.0 */
  onThresholdReached?: () => void;
  /** Called when refresh starts executing */
  onRefreshStart?: () => void;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  maxPull = 130,
  onProgressTick,
  onThresholdReached,
  onRefreshStart,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const thresholdCrossedRef = useRef(false);
  const lastTickRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isAtTop() || isRefreshing) return;
    startYRef.current = e.touches[0].clientY;
    thresholdCrossedRef.current = false;
    lastTickRef.current = 0;
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
      const dampened = Math.min(deltaY / resistance, maxPull);
      setPullDistance(dampened);

      const currentProgress = dampened / threshold;

      // Tension ticks every ~12% of progress
      const tickStep = Math.floor(currentProgress * 8);
      if (tickStep > lastTickRef.current && currentProgress < 1) {
        lastTickRef.current = tickStep;
        onProgressTick?.(currentProgress);
      }

      // Threshold pop – fire once
      if (currentProgress >= 1 && !thresholdCrossedRef.current) {
        thresholdCrossedRef.current = true;
        onThresholdReached?.();
      }
      // Reset if pulled back below threshold
      if (currentProgress < 0.9) {
        thresholdCrossedRef.current = false;
      }
    }
  }, [isAtTop, isRefreshing, resistance, maxPull, threshold, onProgressTick, onThresholdReached]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) {
      startYRef.current = null;
      return;
    }

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(52);
      onRefreshStart?.();
      try {
        await onRefresh();
      } finally {
        await new Promise(r => setTimeout(r, 400));
        setIsRefreshing(false);
        setIsSettling(true);
        setPullDistance(0);
        setTimeout(() => setIsSettling(false), 350);
      }
    } else {
      setIsSettling(true);
      setPullDistance(0);
      setTimeout(() => setIsSettling(false), 300);
    }

    startYRef.current = null;
    pullingRef.current = false;
    thresholdCrossedRef.current = false;
    lastTickRef.current = 0;
  }, [pullDistance, threshold, onRefresh, onRefreshStart]);

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
