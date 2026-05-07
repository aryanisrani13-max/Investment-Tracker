/**
 * Unofficial Yahoo Finance API — no key required.
 * Used as a fallback for Canadian/TSX stocks (.TO, .V, .CN suffixes)
 * that Finnhub's free tier doesn't cover.
 */

const BASE = "https://query2.finance.yahoo.com";

type YFQuote = {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
};

export type YahooQuote = {
  symbol: string;
  price: number;
  prevClose: number;
  dayChange: number;
  dayChangePct: number;
};

async function fetchQuotes(symbols: string[]): Promise<YahooQuote[]> {
  if (symbols.length === 0) return [];
  try {
    const qs = symbols.map(encodeURIComponent).join(",");
    const fields = "regularMarketPrice,regularMarketPreviousClose,regularMarketChange,regularMarketChangePercent";
    const res = await fetch(`${BASE}/v8/finance/quote?symbols=${qs}&fields=${fields}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { quoteResponse?: { result?: YFQuote[] } };
    return (data?.quoteResponse?.result ?? []).map((r) => ({
      symbol: r.symbol,
      price: r.regularMarketPrice ?? 0,
      prevClose: r.regularMarketPreviousClose ?? 0,
      dayChange: r.regularMarketChange ?? 0,
      dayChangePct: r.regularMarketChangePercent ?? 0,
    }));
  } catch {
    return [];
  }
}

export const yahoo = {
  quote: async (symbol: string): Promise<YahooQuote | null> => {
    const results = await fetchQuotes([symbol]);
    return results[0] ?? null;
  },

  quoteMany: async (symbols: string[]): Promise<YahooQuote[]> => {
    return fetchQuotes(symbols);
  },
};

const CANADIAN_SUFFIXES = [".TO", ".V", ".CN"];
export function isCanadian(symbol: string): boolean {
  return CANADIAN_SUFFIXES.some((s) => symbol.endsWith(s));
}
