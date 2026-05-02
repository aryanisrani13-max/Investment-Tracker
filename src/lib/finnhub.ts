import type {
  Candle,
  CompanyProfile,
  LivePrice,
  NewsItem,
  SearchResult,
  StockMetric,
} from "./types";

const BASE = "https://finnhub.io/api/v1";

function key(): string {
  return import.meta.env.VITE_FINNHUB_KEY ?? "";
}

export class FinnhubError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "FinnhubError";
  }
}

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const k = key();
  if (!k) {
    throw new FinnhubError("Missing VITE_FINNHUB_KEY in environment");
  }
  const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), token: k });
  const url = `${BASE}${path}?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) throw new FinnhubError("Rate limited — try again in a few seconds", 429);
    throw new FinnhubError(`Request failed: ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

// In-memory cache for profiles (logos rarely change)
const profileCache = new Map<string, CompanyProfile>();

export const finnhub = {
  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const data = await get<{ result: SearchResult[] }>("/search", { q: query.trim() });
    // Filter to common stock & ETFs only, drop weird suffixes (ADRs etc. still pass)
    return (data.result ?? []).filter((r) => !r.symbol.includes(".") && r.symbol.length <= 5).slice(0, 12);
  },

  async quote(symbol: string): Promise<LivePrice> {
    type Q = { c: number; pc: number; d: number; dp: number };
    const q = await get<Q>("/quote", { symbol });
    return {
      symbol,
      price: q.c,
      prevClose: q.pc,
      dayChange: q.d ?? 0,
      dayChangePct: q.dp ?? 0,
      fetchedAt: Date.now(),
    };
  },

  async quoteMany(symbols: string[]): Promise<LivePrice[]> {
    const unique = Array.from(new Set(symbols));
    const results = await Promise.allSettled(unique.map((s) => finnhub.quote(s)));
    return results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((v): v is LivePrice => v !== null);
  },

  async profile(symbol: string): Promise<CompanyProfile> {
    const cached = profileCache.get(symbol);
    if (cached) return cached;
    type P = {
      ticker?: string;
      name?: string;
      logo?: string;
      exchange?: string;
      finnhubIndustry?: string;
      weburl?: string;
    };
    const p = await get<P>("/stock/profile2", { symbol });
    const profile: CompanyProfile = {
      symbol,
      name: p.name ?? symbol,
      logo: p.logo ?? "",
      exchange: p.exchange ?? "",
      industry: p.finnhubIndustry ?? "",
      weburl: p.weburl,
    };
    profileCache.set(symbol, profile);
    return profile;
  },

  /**
   * Last 3-7 days of company news. Free tier supports this endpoint.
   */
  async companyNews(symbol: string, days = 7): Promise<NewsItem[]> {
    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
    type Raw = {
      id: number;
      headline: string;
      source: string;
      url: string;
      datetime: number; // unix seconds
      image?: string;
    };
    try {
      const data = await get<Raw[]>("/company-news", {
        symbol,
        from: fmt(from),
        to: fmt(to),
      });
      return (data ?? [])
        .filter((n) => n.headline && n.url)
        .slice(0, 10)
        .map((n) => ({
          id: String(n.id),
          headline: n.headline,
          source: n.source ?? "",
          url: n.url,
          datetime: n.datetime * 1000,
          image: n.image,
        }));
    } catch {
      return [];
    }
  },

  /**
   * Returns 52-week high/low and (if available on the user's plan) pre-market
   * and after-hours quotes. The free tier returns the metrics but leaves
   * extended-hours fields undefined; we surface that as null.
   */
  async metric(symbol: string): Promise<StockMetric> {
    type Raw = {
      metric?: {
        "52WeekHigh"?: number;
        "52WeekLow"?: number;
      };
    };
    let high52: number | null = null;
    let low52: number | null = null;
    try {
      const data = await get<Raw>("/stock/metric", { symbol, metric: "all" });
      high52 = data?.metric?.["52WeekHigh"] ?? null;
      low52 = data?.metric?.["52WeekLow"] ?? null;
    } catch {
      // fall through with nulls
    }
    // Pre/after-hours data lives behind the paid plan (/stock/extended-quote).
    // Try it; on 403 we just return nulls.
    let pre: { p: number; d: number; dp: number } | null = null;
    let aft: { p: number; d: number; dp: number } | null = null;
    try {
      type Ext = {
        preMarket?: { p?: number; d?: number; dp?: number };
        afterHours?: { p?: number; d?: number; dp?: number };
      };
      const ext = await get<Ext>("/stock/extended-quote", { symbol });
      if (ext?.preMarket?.p) {
        pre = { p: ext.preMarket.p, d: ext.preMarket.d ?? 0, dp: ext.preMarket.dp ?? 0 };
      }
      if (ext?.afterHours?.p) {
        aft = { p: ext.afterHours.p, d: ext.afterHours.d ?? 0, dp: ext.afterHours.dp ?? 0 };
      }
    } catch {
      // free tier — silently ignore
    }
    return {
      symbol,
      high52,
      low52,
      preMarketPrice: pre?.p ?? null,
      preMarketChange: pre?.d ?? null,
      preMarketChangePct: pre?.dp ?? null,
      afterHoursPrice: aft?.p ?? null,
      afterHoursChange: aft?.d ?? null,
      afterHoursChangePct: aft?.dp ?? null,
    };
  },

  /**
   * Historical daily candles for the detail page chart. Free tier rejects
   * /stock/candle on most symbols — gracefully fall back to the synthesized
   * sparkline (returns null so callers can decide).
   */
  async candleHistorical(symbol: string, days = 90): Promise<Candle[] | null> {
    try {
      const to = Math.floor(Date.now() / 1000);
      const from = to - days * 24 * 60 * 60;
      type Raw = { c?: number[]; t?: number[]; s?: string };
      const data = await get<Raw>("/stock/candle", {
        symbol,
        resolution: "D",
        from,
        to,
      });
      if (data?.s !== "ok" || !data.c || !data.t) return null;
      return data.c.map((c, i) => ({ c, t: (data.t![i] ?? 0) * 1000 }));
    } catch {
      return null;
    }
  },

  /**
   * Free Finnhub plan no longer includes /stock/candle — fall back to
   * synthesizing a tiny sparkline from a sequence of recent quotes.
   * For the app's "7-day sparkline" we just synthesize from prevClose -> price
   * with a smooth curve; for the Progress tab graph we use locally captured
   * snapshots, which is more accurate for the user's actual portfolio.
   */
  async sparkline(symbol: string, points = 14): Promise<Candle[]> {
    const q = await finnhub.quote(symbol);
    // Simple synthesized walk between prevClose and current price, deterministic
    const start = q.prevClose || q.price;
    const end = q.price;
    const out: Candle[] = [];
    const now = Date.now();
    const stepMs = (24 * 60 * 60 * 1000) / points;
    for (let i = 0; i < points; i++) {
      const f = i / (points - 1);
      // soft sine wobble around linear interpolation for visual interest
      const base = start + (end - start) * f;
      const wobble = Math.sin(f * Math.PI * 2 + symbol.charCodeAt(0)) * Math.abs(end - start) * 0.18;
      out.push({ t: now - (points - 1 - i) * stepMs, c: base + wobble });
    }
    // Force the final point to equal the actual current price
    if (out.length) out[out.length - 1].c = end;
    return out;
  },
};
