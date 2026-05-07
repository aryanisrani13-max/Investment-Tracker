import { useEffect, useRef, useState } from "react";
import { finnhub } from "../lib/finnhub";
import type { CompanyProfile, Holding, LivePrice, SearchResult } from "../lib/types";
import { fmtMoney } from "../lib/format";
import { haptics } from "../lib/haptics";
import { BottomSheet } from "./BottomSheet";
import { Logo } from "./Logo";

type Stage = "search" | "details";

export function AddHoldingSheet({
  open,
  onClose,
  onAdd,
  firstTime = false,
  prefillSymbol,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (h: Holding) => void;
  firstTime?: boolean;
  prefillSymbol?: string | null;
}) {
  const [stage, setStage] = useState<Stage>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    sr: SearchResult;
    profile: CompanyProfile;
    quote: LivePrice;
  } | null>(null);
  const [shares, setShares] = useState("");
  const [pricePaid, setPricePaid] = useState("");
  const debounceRef = useRef<number | null>(null);
  const searchGenRef = useRef(0);

  // reset when closed
  useEffect(() => {
    if (!open) {
      setStage("search");
      setQuery("");
      setResults([]);
      setSelected(null);
      setShares("");
      setPricePaid("");
      setError(null);
    }
  }, [open]);

  // When opened with a prefill (e.g. from the Watchlist), jump straight to the
  // details stage with that ticker pre-loaded.
  useEffect(() => {
    if (!open || !prefillSymbol) return;
    if (selected?.sr.symbol === prefillSymbol) return;
    (async () => {
      setLoading(true);
      try {
        const [profile, quote] = await Promise.all([
          finnhub.profile(prefillSymbol),
          finnhub.quote(prefillSymbol),
        ]);
        setSelected({
          sr: { symbol: prefillSymbol, description: profile.name || prefillSymbol, type: "Common Stock", displaySymbol: prefillSymbol },
          profile,
          quote,
        });
        if (quote.price > 0) setPricePaid(quote.price.toFixed(2));
        setStage("details");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't preload that ticker");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, prefillSymbol, selected]);

  // debounced search — generation counter ensures stale responses never
  // overwrite state from a newer query (prevents error+results showing together)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const gen = ++searchGenRef.current;
      setLoading(true);
      setError(null);
      try {
        const r = await finnhub.search(query);
        if (gen !== searchGenRef.current) return; // stale — a newer search is in flight
        setResults(r);
        if (r.length === 0) setError("No results found");
      } catch (err) {
        if (gen !== searchGenRef.current) return;
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (gen === searchGenRef.current) setLoading(false);
      }
    }, 250);
  }, [query]);

  async function pick(sr: SearchResult) {
    setLoading(true);
    setError(null);
    try {
      // profile() never throws now (has internal try/catch), quote() routes
      // Canadian symbols to Yahoo Finance instead of Finnhub.
      const [profile, quote] = await Promise.all([
        finnhub.profile(sr.symbol),
        finnhub.quote(sr.symbol),
      ]);
      setSelected({ sr, profile, quote });
      if (quote.price > 0) setPricePaid(quote.price.toFixed(2));
      setStage("details");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load that ticker");
    } finally {
      setLoading(false);
    }
  }

  function commit() {
    if (!selected) return;
    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(pricePaid);
    if (!Number.isFinite(sharesNum) || sharesNum <= 0) return;
    if (!Number.isFinite(priceNum) || priceNum <= 0) return;
    haptics.success();
    onAdd({
      symbol: selected.sr.symbol,
      name: selected.profile.name || selected.sr.description,
      shares: sharesNum,
      costBasis: priceNum,
      logo: selected.profile.logo,
      addedAt: Date.now(),
    });
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      {stage === "search" && (
        <div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a company or ticker"
            className="w-full bg-[#1a1a1a] text-ink placeholder:text-muted px-4 py-3 rounded-xl text-base mb-3"
          />
          {firstTime && results.length === 0 && !loading && !query && (
            <div className="text-muted text-sm py-2">Search for your first investment</div>
          )}
          {loading && <div className="text-muted text-sm py-2">Searching…</div>}
          {error && <div className="text-loss text-sm py-2">{error}</div>}
          <div className="max-h-[55vh] overflow-y-auto no-scrollbar -mx-1">
            {results.map((r) => (
              <button
                key={r.symbol}
                onClick={() => pick(r)}
                className="w-full flex items-center gap-3 px-1 py-3 hover:bg-[#1a1a1a] active:bg-[#222] rounded-lg text-left"
              >
                <Logo symbol={r.symbol} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-ink text-sm truncate">{r.description}</div>
                  <div className="text-muted text-xs tnum">{r.symbol}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === "details" && selected && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <Logo src={selected.profile.logo} symbol={selected.sr.symbol} size={44} />
            <div className="flex-1 min-w-0">
              <div className="text-ink text-base truncate">{selected.profile.name || selected.sr.description}</div>
              <div className="text-muted text-xs tnum">
                {selected.sr.symbol} · {fmtMoney(selected.quote.price)} now
              </div>
            </div>
          </div>

          <label className="block text-muted text-xs uppercase tracking-wide mb-1">Shares</label>
          <input
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="w-full bg-[#1a1a1a] text-ink placeholder:text-muted px-4 py-3 rounded-xl text-base mb-4 tnum"
          />

          <label className="block text-muted text-xs uppercase tracking-wide mb-1">
            Price paid per share
            {selected.quote.price === 0 && (
              <span className="ml-2 normal-case text-muted/60">— live price unavailable, enter manually</span>
            )}
          </label>
          <input
            value={pricePaid}
            onChange={(e) => setPricePaid(e.target.value)}
            inputMode="decimal"
            placeholder={selected.quote.price === 0 ? "Enter price (e.g. 32.50)" : "0.00"}
            className="w-full bg-[#1a1a1a] text-ink placeholder:text-muted px-4 py-3 rounded-xl text-base mb-6 tnum"
          />

          <div className="flex gap-3">
            <button
              onClick={() => setStage("search")}
              className="flex-1 py-3 rounded-full text-ink/70 text-sm font-medium hover:text-ink"
            >
              Back
            </button>
            <button
              onClick={commit}
              disabled={!shares || !pricePaid}
              className="flex-1 py-3 rounded-full bg-ink text-bg text-sm font-semibold disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
