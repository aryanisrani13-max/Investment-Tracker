export type Holding = {
  symbol: string;
  name: string;
  shares: number;
  costBasis: number; // average price paid per share
  logo?: string;
  addedAt: number;
};

export type LivePrice = {
  symbol: string;
  price: number;
  prevClose: number;
  dayChange: number;
  dayChangePct: number;
  fetchedAt: number;
};

export type Snapshot = {
  t: number; // unix ms
  v: number; // total portfolio value
};

export type Goal = {
  amount: number;
  note: string;
};

export type SearchResult = {
  symbol: string;
  description: string;
  type: string;
  displaySymbol: string;
};

export type CompanyProfile = {
  symbol: string;
  name: string;
  logo: string;
  exchange: string;
  industry: string;
  weburl?: string;
};

export type Candle = {
  t: number;
  c: number;
};

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type ResearchSummary = {
  symbol: string;
  whatTheyDo: string;
  performance: string;
  risk: RiskLevel;
  beginnerFriendly: { verdict: "Yes" | "No" | "Maybe"; reason: string };
  verdict: Verdict;
  verdictReason: string;
};

export type LearnTopic = {
  id: string;
  category: "BASICS" | "STRATEGY" | "TERMS";
  title: string;
  preview: string;
  body?: string; // lazy-loaded from Claude
};

export type TabId =
  | "portfolio"
  | "progress"
  | "research"
  | "watchlist"
  | "journal"
  | "goals"
  | "learn";

export type TimeRange = "1D" | "7D" | "3W" | "1M" | "ALL";

export type NewsItem = {
  id: string;
  headline: string;
  source: string;
  url: string;
  datetime: number; // unix ms
  image?: string;
};

export type StockMetric = {
  symbol: string;
  high52: number | null;
  low52: number | null;
  preMarketPrice: number | null;
  preMarketChange: number | null;
  preMarketChangePct: number | null;
  afterHoursPrice: number | null;
  afterHoursChange: number | null;
  afterHoursChangePct: number | null;
};

export type WatchlistItem = {
  symbol: string;
  name: string;
  logo?: string;
  note: string;
  addedAt: number;
};

export type JournalEntry = {
  id: string;
  t: number; // unix ms
  symbol?: string;
  action?: "bought" | "sold" | "milestone" | "note";
  title: string;
  body: string;
};

export type MilestoneId =
  | "first-trade"
  | "first-50-gain"
  | "up-5-percent"
  | "up-10-percent";

export type Milestone = {
  id: MilestoneId;
  reachedAt: number;
};

export type RealizedTrade = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  salePrice: number;
  costBasis: number;
  soldAt: number; // unix ms
  realizedGain: number;
};

export type Verdict = "BUY" | "HOLD" | "WATCH";
