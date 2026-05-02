import type { Holding, LivePrice } from "./types";

export type EnrichedHolding = Holding & {
  livePrice: number | null;
  marketValue: number;
  costTotal: number;
  gain: number;
  gainPct: number;
  dayChange: number;
  dayChangePct: number;
};

export function enrichHolding(h: Holding, prices: Record<string, LivePrice>): EnrichedHolding {
  const lp = prices[h.symbol];
  const livePrice = lp ? lp.price : null;
  const marketValue = (livePrice ?? h.costBasis) * h.shares;
  const costTotal = h.costBasis * h.shares;
  const gain = marketValue - costTotal;
  const gainPct = costTotal > 0 ? (gain / costTotal) * 100 : 0;
  return {
    ...h,
    livePrice,
    marketValue,
    costTotal,
    gain,
    gainPct,
    dayChange: lp?.dayChange ?? 0,
    dayChangePct: lp?.dayChangePct ?? 0,
  };
}

export type PortfolioStats = {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPct: number;
  best: EnrichedHolding | null;
  worst: EnrichedHolding | null;
};

export function computeStats(
  holdings: Holding[],
  prices: Record<string, LivePrice>
): { enriched: EnrichedHolding[]; stats: PortfolioStats } {
  const enriched = holdings.map((h) => enrichHolding(h, prices));
  const totalValue = enriched.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = enriched.reduce((s, h) => s + h.costTotal, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  let best: EnrichedHolding | null = null;
  let worst: EnrichedHolding | null = null;
  for (const h of enriched) {
    if (h.livePrice === null) continue;
    if (best === null || h.gainPct > best.gainPct) best = h;
    if (worst === null || h.gainPct < worst.gainPct) worst = h;
  }
  return {
    enriched,
    stats: { totalValue, totalCost, totalGain, totalGainPct, best, worst },
  };
}
