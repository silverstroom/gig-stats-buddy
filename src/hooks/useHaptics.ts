/**
 * Haptic feedback utility hook.
 * Uses the Vibration API where available (Android Chrome, etc.).
 */
export function useHaptics() {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  /** Subtle tick – selection-style micro feedback (tension phase) */
  const tick = () => {
    if (canVibrate) navigator.vibrate(8);
  };

  const light = () => {
    if (canVibrate) navigator.vibrate(12);
  };

  const medium = () => {
    if (canVibrate) navigator.vibrate(30);
  };

  /** Sharp decisive "pop" – threshold reached, snappy click feel */
  const pop = () => {
    if (canVibrate) navigator.vibrate(35);
  };

  /** Soft double-tap confirmation pulse */
  const confirm = () => {
    if (canVibrate) navigator.vibrate([12, 40, 12]);
  };

  const success = () => {
    if (canVibrate) navigator.vibrate([18, 50, 18]);
  };

  const error = () => {
    if (canVibrate) navigator.vibrate([50, 30, 50, 30, 50]);
  };

  return { tick, light, medium, pop, confirm, success, error, canVibrate };
}
