import { ChevronLeft, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { fetchResearchSummary, fetchWhyItMoved } from "../lib/claude";
import { finnhub } from "../lib/finnhub";
import { fmtMoney, fmtPct, fmtRelativeTime, fmtShares } from "../lib/format";
import { haptics } from "../lib/haptics";
import type {
  Candle,
  CompanyProfile,
  LivePrice,
  NewsItem,
  ResearchSummary,
  StockMetric,
} from "../lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { Logo } from "./Logo";
import { Skeleton } from "./Skeleton";

type Props = {
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  livePrice: LivePrice | null;
  onBack: () => void;
  onDeleteForever: () => void;
};

export function StockDetail({
  symbol,
  name,
  shares,
  costBasis,
  livePrice,
  onBack,
  onDeleteForever,
}: Props) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [chart, setChart] = useState<Candle[] | null>(null);
  const [metric, setMetric] = useState<StockMetric | null>(null);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [summary, setSummary] = useState<ResearchSummary | null>(null);
  const [whyText, setWhyText] = useState<string | null>(null);
  const [whyLoading, setWhyLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let alive = true;
    finnhub.profile(symbol).then((p) => alive && setProfile(p));
    finnhub
      .candleHistorical(symbol, 90)
      .then((c) => (alive ? setChart(c ?? []) : null))
      .catch(() => alive && setChart([]));
    finnhub.metric(symbol).then((m) => alive && setMetric(m));
    finnhub.companyNews(symbol, 7).then((n) => alive && setNews(n));
    fetchResearchSummary(symbol, name).then((s) => alive && setSummary(s));
    return () => {
      alive = false;
    };
  }, [symbol, name]);

  // Fall back to a synthesized sparkline if real candle data isn't available.
  useEffect(() => {
    if (chart !== null && chart.length === 0) {
      finnhub.sparkline(symbol, 30).then((c) => setChart(c));
    }
  }, [chart, symbol]);

  const price = livePrice?.price ?? costBasis;
  const dayChange = livePrice?.dayChange ?? 0;
  const dayChangePct = livePrice?.dayChangePct ?? 0;
  const dayUp = dayChangePct >= 0;
  const dayColor = dayChangePct === 0 ? "text-muted" : dayUp ? "text-gain" : "text-loss";

  const marketValue = price * shares;
  const costTotal = costBasis * shares;
  const gain = marketValue - costTotal;
  const gainPct = costTotal > 0 ? (gain / costTotal) * 100 : 0;
  const gainColor = gain === 0 ? "text-muted" : gain > 0 ? "text-gain" : "text-loss";

  const lineColor = dayUp ? "#00c805" : "#ff5000";

  const canExplain = Math.abs(dayChangePct) > 2;

  function explain() {
    if (!canExplain || whyLoading) return;
    setWhyLoading(true);
    haptics.tap();
    fetchWhyItMoved(symbol, name, dayChangePct, news ?? [])
      .then(setWhyText)
      .finally(() => setWhyLoading(false));
  }

  function handleDelete() {
    haptics.warning();
    onDeleteForever();
  }

  return (
    <div className="absolute inset-0 z-50 bg-bg overflow-y-auto pb-12 animate-fade-in">
      <header className="px-4 pt-12 pb-2 flex items-center">
        <button
          onClick={onBack}
          className="-ml-2 p-2 text-ink hover:bg-[#1a1a1a] rounded-full"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
      </header>

      <div className="px-6">
        <div className="flex items-center gap-3 mb-3">
          <Logo src={profile?.logo} symbol={symbol} size={36} />
          <div className="flex-1 min-w-0">
            <div className="text-ink text-base truncate">{profile?.name ?? name}</div>
            <div className="text-muted text-xs tnum">{symbol}</div>
          </div>
        </div>
        <AnimatedNumber
          value={price}
          format={(n) => fmtMoney(n)}
          className="text-hero tnum text-ink"
        />
        <div className={`mt-1 text-sm tnum ${dayColor}`}>
          {fmtMoney(dayChange, { showSign: true })} ({fmtPct(dayChangePct)})
          {livePrice && (
            <span className="text-muted ml-2">{fmtRelativeTime(livePrice.fetchedAt)}</span>
          )}
        </div>
      </div>

      <div className="h-[200px] mt-4">
        {chart === null ? (
          <div className="px-6 pt-6">
            <Skeleton w="100%" h={160} />
          </div>
        ) : chart.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm">
            No chart data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`detail-fill-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide domain={["dataMin", "dataMax"]} type="number" />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Area
                type="monotone"
                dataKey="c"
                stroke={lineColor}
                strokeWidth={2}
                fill={`url(#detail-fill-${symbol})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 52-week range */}
      <div className="px-6 mt-6">
        <div className="text-muted text-xs uppercase tracking-wide mb-2">52-week range</div>
        {metric === null ? (
          <Skeleton w="100%" h={28} />
        ) : metric.high52 && metric.low52 ? (
          <RangeBar low={metric.low52} high={metric.high52} current={price} />
        ) : (
          <div className="text-muted text-sm">—</div>
        )}
      </div>

      {/* Pre / after-hours */}
      <div className="px-6 mt-6 grid grid-cols-2 gap-x-4">
        <ExtendedRow
          label="Pre-market"
          price={metric?.preMarketPrice ?? null}
          changePct={metric?.preMarketChangePct ?? null}
        />
        <ExtendedRow
          label="After-hours"
          price={metric?.afterHoursPrice ?? null}
          changePct={metric?.afterHoursChangePct ?? null}
        />
      </div>

      {/* Position */}
      <div className="px-6 mt-8">
        <div className="text-muted text-xs uppercase tracking-wide mb-2">Your position</div>
        <div className="grid grid-cols-2 gap-y-3">
          <Stat label="Shares" value={fmtShares(shares)} />
          <Stat label="Cost basis" value={fmtMoney(costBasis)} />
          <Stat label="Market value" value={fmtMoney(marketValue)} />
          <Stat
            label="Gain / loss"
            value={`${fmtMoney(gain, { showSign: true })} (${fmtPct(gainPct)})`}
            color={gainColor}
          />
        </div>
      </div>

      {/* Why did this move? */}
      <div className="px-6 mt-8">
        <button
          onClick={explain}
          disabled={!canExplain || whyLoading}
          className="text-sm font-medium text-ink disabled:text-muted disabled:cursor-not-allowed underline-offset-4 hover:underline"
        >
          {whyLoading ? "Asking…" : "Why did this move?"}
        </button>
        {!canExplain && (
          <div className="text-muted text-xs mt-1">
            Available when the stock moves more than 2% in a day.
          </div>
        )}
        {whyText && (
          <div className="mt-3 border-l border-ink pl-3 text-ink text-sm leading-relaxed whitespace-pre-line">
            {whyText}
          </div>
        )}
      </div>

      {/* News */}
      <div className="px-6 mt-8">
        <div className="text-muted text-xs uppercase tracking-wide mb-3">Recent news</div>
        {news === null ? (
          <div className="space-y-3">
            <Skeleton w="100%" h={48} />
            <Skeleton w="100%" h={48} />
            <Skeleton w="100%" h={48} />
          </div>
        ) : news.length === 0 ? (
          <div className="text-muted text-sm">No news available.</div>
        ) : (
          <ul>
            {news.slice(0, 3).map((n) => (
              <li key={n.id}>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-3 border-b border-border last:border-b-0 hover:bg-[#0f0f0f] -mx-2 px-2"
                >
                  <div className="text-ink text-sm leading-snug">{n.headline}</div>
                  <div className="text-muted text-xs mt-1 flex items-center gap-1">
                    {n.source} · {fmtRelativeTime(n.datetime)}
                    <ExternalLink size={11} className="ml-1" />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* AI summary */}
      <div className="px-6 mt-8">
        <div className="text-muted text-xs uppercase tracking-wide mb-2">AI summary</div>
        {summary === null ? (
          <div className="space-y-2">
            <Skeleton w="100%" h={14} />
            <Skeleton w="80%" h={14} />
            <Skeleton w="90%" h={14} />
          </div>
        ) : (
          <div className="text-ink text-sm leading-relaxed">{summary.whatTheyDo}</div>
        )}
      </div>

      {/* Delete forever */}
      <div className="px-6 mt-12">
        {confirmDelete ? (
          <div className="border-t border-border pt-4">
            <div className="text-ink text-sm mb-3">
              Permanently remove {symbol} from your portfolio? Use the swipe-to-sell on the
              row instead if you want this tracked in Realized Gains.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-full text-ink/70 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-full bg-loss text-white text-sm font-semibold"
              >
                Delete forever
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-muted text-xs hover:text-loss"
          >
            Delete forever
          </button>
        )}
      </div>
    </div>
  );
}

function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const denom = high - low;
  const pct = denom > 0 ? Math.max(0, Math.min(1, (current - low) / denom)) : 0.5;
  return (
    <div>
      <div className="relative h-1 bg-[#1a1a1a] rounded-full">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-ink shadow-sm"
          style={{ left: `calc(${(pct * 100).toFixed(2)}% - 5px)` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs tnum">
        <span className="text-muted">{fmtMoney(low)}</span>
        <span className="text-muted">{fmtMoney(high)}</span>
      </div>
    </div>
  );
}

function ExtendedRow({
  label,
  price,
  changePct,
}: {
  label: string;
  price: number | null;
  changePct: number | null;
}) {
  const color =
    changePct === null
      ? "text-muted"
      : changePct > 0
        ? "text-gain"
        : changePct < 0
          ? "text-loss"
          : "text-muted";
  return (
    <div>
      <div className="text-muted text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className="text-ink text-sm tnum">{price !== null ? fmtMoney(price) : "—"}</div>
      <div className={`text-xs tnum ${color}`}>{changePct !== null ? fmtPct(changePct) : "—"}</div>
    </div>
  );
}

function Stat({ label, value, color = "text-ink" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-muted text-xs mb-0.5">{label}</div>
      <div className={`tnum text-base ${color}`}>{value}</div>
    </div>
  );
}
