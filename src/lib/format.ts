export function fmtMoney(n: number, opts?: { showSign?: boolean; decimals?: number }): string {
  const decimals = opts?.decimals ?? 2;
  const sign = opts?.showSign ? (n > 0 ? "+" : n < 0 ? "−" : "") : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}$${formatted}`;
}

export function fmtPct(n: number, opts?: { showSign?: boolean }): string {
  const showSign = opts?.showSign ?? true;
  const sign = showSign ? (n > 0 ? "+" : n < 0 ? "−" : "") : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

export function fmtCompact(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function fmtShares(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function fmtRelativeTime(ms: number): string {
  const diff = Math.max(0, Date.now() - ms);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
