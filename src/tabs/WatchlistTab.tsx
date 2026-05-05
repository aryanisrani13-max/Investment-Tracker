import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "../components/Logo";
import { fmtMoney, fmtPct } from "../lib/format";
import { finnhub } from "../lib/finnhub";
import { storage } from "../lib/storage";
import type { LivePrice, SearchResult, WatchlistItem } from "../lib/types";

export function WatchlistTab({
  onAddToPortfolio,
}: {
  onAddToPortfolio: (item: WatchlistItem) => void;
}) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Load watchlist from storage on mount
  useEffect(() => {
    storage.getWatchlist().then(setItems);
  }, []);

  // Fetch prices for everything in the watchlist
  useEffect(() => {
    if (items.length === 0) return;
    finnhub
      .quoteMany(items.map((i) => i.symbol))
      .then((qs) => {
        const map: Record<string, LivePrice> = {};
        for (const q of qs) map[q.symbol] = q;
        setPrices((curr) => ({ ...curr, ...map }));
      })
      .catch(() => {
        /* graceful — keep last prices */
      });
  }, [items]);

  // Debounced search
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
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [query]);

  async function persist(next: WatchlistItem[]) {
    setItems(next);
    await storage.setWatchlist(next);
  }

  async function add(sr: SearchResult) {
    if (items.some((i) => i.symbol === sr.symbol)) {
      setShowSearch(false);
      setQuery("");
      setResults([]);
      return;
    }
    const profile = await finnhub.profile(sr.symbol).catch(() => null);
    await persist([
      ...items,
      {
        symbol: sr.symbol,
        name: profile?.name || sr.description,
        logo: profile?.logo,
        note: "",
        addedAt: Date.now(),
      },
    ]);
    setShowSearch(false);
    setQuery("");
    setResults([]);
  }

  async function remove(symbol: string) {
    await persist(items.filter((i) => i.symbol !== symbol));
  }

  async function updateNote(symbol: string, note: string) {
    await persist(items.map((i) => (i.symbol === symbol ? { ...i, note } : i)));
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28">
      <header className="px-6 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-ink text-2xl font-semibold">Watchlist</h1>
        <button
          onClick={() => setShowSearch((v) => !v)}
          className="text-ink text-sm font-medium flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      </header>

      {showSearch && (
        <div className="px-6 mb-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a company or ticker"
            className="w-full bg-[#1a1a1a] text-ink placeholder:text-muted px-4 py-3 rounded-xl text-base"
          />
          {searching && results.length === 0 && (
            <div className="text-muted text-sm mt-2">Searching…</div>
          )}
          {results.length > 0 && (
            <div className="mt-2 max-h-64 overflow-y-auto no-scrollbar">
              {results.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => add(r)}
                  className="w-full flex items-center gap-3 px-2 py-2 hover:bg-[#1a1a1a] rounded-lg text-left"
                >
                  <Logo symbol={r.symbol} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-ink text-sm truncate">{r.description}</div>
                    <div className="text-muted text-xs tnum">{r.symbol}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="px-6 py-16 text-center text-muted text-sm">
          Nothing on your watchlist yet. Tap Add to track a stock without buying it.
        </div>
      ) : (
        <ul>
          {items.map((it) => {
            const p = prices[it.symbol];
            const dayColor =
              !p || p.dayChangePct === 0
                ? "text-muted"
                : p.dayChangePct > 0
                  ? "text-gain"
                  : "text-loss";
            return (
              <li key={it.symbol} className="border-b border-border last:border-b-0 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Logo src={it.logo} symbol={it.symbol} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-ink text-base truncate">{it.name}</div>
                    <div className="text-muted text-sm tnum">{it.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-ink text-base tnum">
                      {p ? fmtMoney(p.price) : "—"}
                    </div>
                    <div className={`text-sm tnum ${dayColor}`}>
                      {p ? fmtPct(p.dayChangePct) : "—"}
                    </div>
                  </div>
                </div>
                <textarea
                  value={it.note}
                  onChange={(e) => updateNote(it.symbol, e.target.value)}
                  placeholder="Notes…"
                  rows={1}
                  className="mt-3 w-full bg-transparent text-muted text-sm placeholder:text-muted/60 resize-none focus:text-ink focus:bg-[#0f0f0f] px-2 py-1 -mx-2 rounded"
                />
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => onAddToPortfolio(it)}
                    className="text-ink text-xs font-medium hover:underline"
                  >
                    Add to portfolio
                  </button>
                  <button
                    onClick={() => remove(it.symbol)}
                    className="text-muted text-xs hover:text-loss"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
