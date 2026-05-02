import { useEffect, useState } from "react";
import { getMarketStatus, type MarketStatus } from "../lib/market";

/**
 * Tiny circular indicator: green when the US market is open, muted grey when
 * closed. Re-checks every minute so it flips automatically across the bell.
 */
export function MarketDot({ size = 8 }: { size?: number }) {
  const [status, setStatus] = useState<MarketStatus>(() => getMarketStatus());

  useEffect(() => {
    const id = window.setInterval(() => setStatus(getMarketStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const open = status === "open";
  return (
    <span
      className={`inline-block ${open ? "bg-gain" : "bg-muted"} rounded-full`}
      style={{
        width: size,
        height: size,
        boxShadow: open ? "0 0 6px rgba(0,200,5,0.45)" : undefined,
      }}
      role="status"
      aria-label={open ? "Market open" : "Market closed"}
    />
  );
}
