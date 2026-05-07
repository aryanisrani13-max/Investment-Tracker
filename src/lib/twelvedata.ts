/**
 * Twelve Data API — free tier, 800 calls/day, no CORS issues.
 * Used for Canadian/TSX stock quotes that Finnhub free tier doesn't cover.
 * Sign up at https://twelvedata.com to get a free API key, then set
 * VITE_TWELVEDATA_KEY in your Vercel environment variables.
 */

const BASE = "https://api.twelvedata.com";

function key(): string {
  return import.meta.env.VITE_TWELVEDATA_KEY ?? "";
}

export function twelveDataAvailable(): boolean {
  return key().length > 0;
}

type TDQuote = {
  symbol?: string;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  status?: string;
};

export type TwelveDataQuote = {
  symbol: string;
  price: number;
  prevClose: number;
  dayChange: number;
  dayChangePct: number;
};

async function fetchQuotes(symbols: string[]): Promise<TwelveDataQuote[]> {
  if (symbols.length === 0 || !key()) return [];
  try {
    const joined = symbols.join(",");
    const res = await fetch(
      `${BASE}/quote?symbol=${encodeURIComponent(joined)}&apikey=${key()}`
    );
    if (!res.ok) return [];
    const raw = await res.json() as Record<string, TDQuote> | TDQuote;

    // Single symbol → response is the quote object directly
    // Multiple symbols → response is { SYMBOL: quote, ... }
    const entries: Array<[string, TDQuote]> =
      symbols.length === 1
        ? [[symbols[0], raw as TDQuote]]
        : Object.entries(raw as Record<string, TDQuote>);

    return entries
      .filter(([, q]) => q.status !== "error" && q.close)
      .map(([sym, q]) => ({
        symbol: sym,
        price: parseFloat(q.close ?? "0") || 0,
        prevClose: parseFloat(q.previous_close ?? "0") || 0,
        dayChange: parseFloat(q.change ?? "0") || 0,
        dayChangePct: parseFloat(q.percent_change ?? "0") || 0,
      }));
  } catch {
    return [];
  }
}

export const twelvedata = {
  quote: async (symbol: string): Promise<TwelveDataQuote | null> => {
    const results = await fetchQuotes([symbol]);
    return results[0] ?? null;
  },

  quoteMany: async (symbols: string[]): Promise<TwelveDataQuote[]> => {
    // Twelve Data batch endpoint accepts comma-separated symbols
    return fetchQuotes(symbols);
  },
};
