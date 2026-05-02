import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "../components/Logo";
import { Sparkline } from "../components/Sparkline";
import { fetchResearchSummary } from "../lib/claude";
import { fmtMoney, fmtPct } from "../lib/format";
import { finnhub } from "../lib/finnhub";
import type {
  Candle,
  CompanyProfile,
  LivePrice,
  ResearchSummary,
  RiskLevel,
  SearchResult,
  Verdict,
} from "../lib/types";

type Loaded = {
  symbol: string;
  profile: CompanyProfile;
  quote: LivePrice;
  spark: Candle[];
  summary: ResearchSummary | null;
  loadingSummary: boolean;
};

export function ResearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [primary, setPrimary] = useState<Loaded | null>(null);
  const [comparing, setComparing] = useState<Loaded | null>(null);
  const [showCompareSearch, setShowCompareSearch] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await finnhub.search(query));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [query]);

  async function loadTicker(symbol: string): Promise<Loaded> {
    const [profile, quote, spark] = await Promise.all([
      finnhub.profile(symbol),
      finnhub.quote(symbol),
      finnhub.sparkline(symbol, 14),
    ]);
    return {
      symbol,
      profile,
      quote,
      spark,
      summary: null,
      loadingSummary: true,
    };
  }

  async function pickPrimary(symbol: string) {
    setQuery("");
    setResults([]);
    const loaded = await loadTicker(symbol);
    setPrimary(loaded);
    fetchResearchSummary(symbol, loaded.profile.name || symbol).then((summary) =>
      setPrimary((curr) => (curr && curr.symbol === symbol ? { ...curr, summary, loadingSummary: false } : curr))
    );
  }

  async function pickCompare(symbol: string) {
    setShowCompareSearch(false);
    setQuery("");
    setResults([]);
    const loaded = await loadTicker(symbol);
    setComparing(loaded);
    fetchResearchSummary(symbol, loaded.profile.name || symbol).then((summary) =>
      setComparing((curr) => (curr && curr.symbol === symbol ? { ...curr, summary, loadingSummary: false } : curr))
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28">
      <header className="px-6 pt-12 pb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a company or ticker"
          className="w-full bg-[#1a1a1a] text-ink placeholder:text-muted px-4 py-3 rounded-xl text-base"
        />
      </header>

      {results.length > 0 && (
        <div className="px-3 pb-2 max-h-72 overflow-y-auto no-scrollbar">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => (showCompareSearch ? pickCompare(r.symbol) : pickPrimary(r.symbol))}
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#1a1a1a] rounded-lg text-left"
            >
              <Logo symbol={r.symbol} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-ink text-sm truncate">{r.description}</div>
                <div className="text-muted text-xs tnum">{r.symbol}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {searching && results.length === 0 && (
        <div className="px-6 text-muted text-sm">Searching…</div>
      )}

      {!primary && results.length === 0 && (
        <div className="px-6 py-16 text-center text-muted text-sm">
          Search any stock or ETF to get a plain-English breakdown.
        </div>
      )}

      {primary && (
        <div className={`grid ${comparing ? "grid-cols-2" : "grid-cols-1"} gap-0`}>
          <ResearchPanel data={primary} />
          {comparing && (
            <div className="border-l border-border">
              <ResearchPanel
                data={comparing}
                onClose={() => setComparing(null)}
              />
            </div>
          )}
        </div>
      )}

      {primary && !comparing && !showCompareSearch && (
        <div className="px-6 mt-4">
          <button
            onClick={() => setShowCompareSearch(true)}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink"
          >
            <Plus size={16} /> Compare
          </button>
        </div>
      )}

      {showCompareSearch && (
        <div className="px-6 mt-3 text-muted text-xs uppercase tracking-wide">
          Search for a second ticker above
        </div>
      )}
    </div>
  );
}

function ResearchPanel({ data, onClose }: { data: Loaded; onClose?: () => void }) {
  const dayUp = data.quote.dayChangePct >= 0;
  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-3 mb-4">
        <Logo src={data.profile.logo} symbol={data.symbol} size={40} />
        <div className="flex-1 min-w-0">
          <div className="text-ink text-base truncate">{data.profile.name || data.symbol}</div>
          <div className="text-muted text-xs tnum">{data.symbol}</div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Remove" className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        )}
      </div>

      <Section label="What they do">{textOrLoading(data.summary?.whatTheyDo, data.loadingSummary)}</Section>
      <Section label="How it's been performing">
        {textOrLoading(data.summary?.performance, data.loadingSummary)}
      </Section>
      <Section label="Risk level">
        {data.loadingSummary ? <span className="text-muted">…</span> : <RiskTag risk={data.summary?.risk ?? "MEDIUM"} />}
      </Section>
      <Section label="Good for beginners?">
        {data.loadingSummary ? (
          <span className="text-muted">…</span>
        ) : (
          <>
            <span className="text-ink">{data.summary?.beginnerFriendly.verdict ?? "—"}.</span>{" "}
            <span className="text-muted">{data.summary?.beginnerFriendly.reason ?? ""}</span>
          </>
        )}
      </Section>

      {!data.loadingSummary && data.summary && (
        <div className="mt-4">
          <VerdictPill verdict={data.summary.verdict} />
          <div className="text-muted text-sm mt-2 leading-relaxed">{data.summary.verdictReason}</div>
          <div className="text-muted italic text-xs mt-3">
            This is an educational opinion, not financial advice.
          </div>
        </div>
      )}

      <div className="mt-5 mb-2 flex items-baseline justify-between">
        <div className="tnum text-ink text-xl">{fmtMoney(data.quote.price)}</div>
        <div className={`tnum text-sm ${dayUp ? "text-gain" : "text-loss"}`}>
          {fmtMoney(data.quote.dayChange, { showSign: true })} ({fmtPct(data.quote.dayChangePct)})
        </div>
      </div>
      <Sparkline data={data.spark} up={dayUp} />
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-muted text-xs uppercase tracking-wide mb-1.5">{label}</div>
      <div className="text-ink text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function textOrLoading(text: string | undefined, loading: boolean) {
  if (loading) return <span className="text-muted">Generating…</span>;
  return text ?? "—";
}

function RiskTag({ risk }: { risk: RiskLevel }) {
  const map: Record<RiskLevel, { color: string; bg: string }> = {
    LOW: { color: "#00c805", bg: "rgba(0,200,5,0.12)" },
    MEDIUM: { color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
    HIGH: { color: "#ff5000", bg: "rgba(255,80,0,0.12)" },
  };
  const s = map[risk];
  return (
    <span
      className="inline-block text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {risk}
    </span>
  );
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  // Intentionally never green/red — this is an opinion, not a price signal.
  const map: Record<Verdict, { color: string; bg: string; border: string }> = {
    BUY: { color: "#ffffff", bg: "transparent", border: "#ffffff" },
    HOLD: { color: "#a3a3a3", bg: "transparent", border: "#525252" },
    WATCH: { color: "#a3a3a3", bg: "transparent", border: "#525252" },
  };
  const s = map[verdict];
  return (
    <span
      className="inline-block text-[11px] font-semibold tracking-[0.2em] px-3 py-1 rounded-full"
      style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}` }}
    >
      {verdict}
    </span>
  );
}
