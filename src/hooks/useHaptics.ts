/**
 * Haptic feedback utility hook.
 * Uses the Vibration API where available (Android Chrome, etc.).
 */
export function useHaptics() {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const light = () => {
    if (canVibrate) navigator.vibrate(10);
  };

  const medium = () => {
    if (canVibrate) navigator.vibrate(25);
  };

  const success = () => {
    if (canVibrate) navigator.vibrate([15, 50, 15]);
  };

  const error = () => {
    if (canVibrate) navigator.vibrate([50, 30, 50, 30, 50]);
  };

  return { light, medium, success, error, canVibrate };
}
