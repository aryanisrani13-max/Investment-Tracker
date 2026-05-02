/**
 * Thin wrappers around navigator.vibrate. No-op on desktops / browsers without
 * the API (older Safari, Firefox). Never throws.
 */

function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore — vibrate is best-effort
  }
}

export const haptics = {
  /** Light tap — UI confirmations like opening a sheet */
  tap(): void {
    vibrate(8);
  },
  /** Success pulse — completed trade, saved goal */
  success(): void {
    vibrate([10, 40, 10]);
  },
  /** Warning pulse — destructive confirm, sell */
  warning(): void {
    vibrate(25);
  },
};
