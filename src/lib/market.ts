export type MarketStatus = "open" | "closed";

/**
 * Returns whether the US stock market is open right now.
 *
 * Uses NYSE regular hours: 9:30 AM – 4:00 PM Eastern Time, Monday–Friday.
 * Does NOT account for federal holidays (Thanksgiving, Christmas, etc.) — the
 * dot will read "open" on those days. Good enough for a personal tracker; can
 * be hardened later by hard-coding the holiday calendar.
 */
export function getMarketStatus(now: Date = new Date()): MarketStatus {
  // Convert to Eastern Time using Intl with a fixed timezone.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday"); // "Mon" .. "Sun"
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);

  if (weekday === "Sat" || weekday === "Sun") return "closed";
  const minutesNow = hour * 60 + minute;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  return minutesNow >= open && minutesNow < close ? "open" : "closed";
}
