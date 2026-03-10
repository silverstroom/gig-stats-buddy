/**
 * Haptic feedback utility hook.
 * Uses the Vibration API where available (Android Chrome, etc.).
 */
export function useHaptics() {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  /** Subtle tick – selection-style micro feedback */
  const tick = () => {
    if (canVibrate) navigator.vibrate(3);
  };

  const light = () => {
    if (canVibrate) navigator.vibrate(10);
  };

  const medium = () => {
    if (canVibrate) navigator.vibrate(25);
  };

  /** Sharp "pop" – threshold reached */
  const pop = () => {
    if (canVibrate) navigator.vibrate(18);
  };

  /** Soft confirmation pulse */
  const confirm = () => {
    if (canVibrate) navigator.vibrate([8, 60, 8]);
  };

  const success = () => {
    if (canVibrate) navigator.vibrate([15, 50, 15]);
  };

  const error = () => {
    if (canVibrate) navigator.vibrate([50, 30, 50, 30, 50]);
  };

  return { tick, light, medium, pop, confirm, success, error, canVibrate };
}
