import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AddHoldingSheet } from "../components/AddHoldingSheet";
import { AllocationDonut } from "../components/AllocationDonut";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { DailyBriefing } from "../components/DailyBriefing";
import { Logo } from "../components/Logo";
import { MarketDot } from "../components/MarketDot";
import { SellSheet } from "../components/SellSheet";
import { SwipeRow } from "../components/SwipeRow";
import { fmtDate, fmtMoney, fmtPct, fmtRelativeTime, fmtShares } from "../lib/format";
import { computeStats } from "../lib/portfolio";
import type { Holding, LivePrice, RealizedTrade } from "../lib/types";

export function PortfolioTab({
  holdings,
  prices,
  realized,
  lastUpdated,
  refreshing,
  onRefresh,
  onAdd,
  onSell,
  onOpenDetail,
  onOpenMore,
  showOnboarding,
  dismissOnboarding,
  prefillSymbol,
  consumePrefill,
}: {
  holdings: Holding[];
  prices: Record<string, LivePrice>;
  realized: RealizedTrade[];
  lastUpdated: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  onAdd: (h: Holding) => void;
  onSell: (symbol: string, shares: number, salePrice: number) => void;
  onOpenDetail: (symbol: string) => void;
  onOpenMore: () => void;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  prefillSymbol?: string | null;
  consumePrefill?: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(showOnboarding || !!prefillSymbol);
  const [sellingSymbol, setSellingSymbol] = useState<string | null>(null);

  // If a prefill arrives after mount (switched here from Watchlist), open the sheet
  useEffect(() => {
    if (prefillSymbol) setSheetOpen(true);
  }, [prefillSymbol]);
  const { enriched, stats } = computeStats(holdings, prices);
  const sellingHolding = sellingSymbol ? holdings.find((h) => h.symbol === sellingSymbol) ?? null : null;
  const realizedTotal = realized.reduce((s, t) => s + t.realizedGain, 0);

  const gainColor =
    stats.totalCost === 0
      ? "text-muted"
      : stats.totalGain > 0
        ? "text-gain"
        : stats.totalGain < 0
          ? "text-loss"
          : "text-muted";

  const handleAdd = (h: Holding) => {
    onAdd(h);
    if (showOnboarding) dismissOnboarding();
    consumePrefill?.();
  };

  const handleClose = () => {
    setSheetOpen(false);
    if (showOnboarding) dismissOnboarding();
    consumePrefill?.();
  };

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <AnimatedNumber
              value={stats.totalValue}
              format={(n) => fmtMoney(n)}
              className="text-hero tnum text-ink"
            />
            <div className={`mt-2 text-sm tnum ${gainColor}`}>
              {fmtMoney(stats.totalGain, { showSign: true })}{" "}
              <span className="ml-1">({fmtPct(stats.totalGainPct)})</span>
            </div>
          </div>
          <div className="flex flex-col items-end pt-2">
            <div className="flex items-center gap-3">
              <MarketDot />
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="text-ink text-sm font-medium disabled:opacity-50"
              >
                {refreshing ? "Updating…" : "Update"}
              </button>
              <button
                onClick={onOpenMore}
                className="text-muted text-sm font-medium hover:text-ink"
              >
                More
              </button>
            </div>
            {lastUpdated && (
              <div className="text-muted text-xs mt-1">Updated {fmtRelativeTime(lastUpdated)}</div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        {holdings.length > 0 && <DailyBriefing holdings={holdings} prices={prices} />}
        {holdings.length > 0 && (
          <AllocationDonut enriched={enriched} totalValue={stats.totalValue} />
        )}
        {enriched.length === 0 ? (
          <div className="px-6 py-16 text-center text-muted text-sm">
            No holdings yet. Tap the + to add your first one.
          </div>
        ) : (
          <ul className="mt-2">
            {enriched.map((h) => {
              const dayColor =
                h.dayChangePct === 0
                  ? "text-muted"
                  : h.dayChangePct > 0
                    ? "text-gain"
                    : "text-loss";
              return (
                <li key={h.symbol} className="border-b border-border last:border-b-0">
                  <SwipeRow
                    onAction={() => setSellingSymbol(h.symbol)}
                    actionLabel="Sell"
                    actionTone="neutral"
                  >
                    <button
                      onClick={() => onOpenDetail(h.symbol)}
                      className="w-full flex items-center px-6 py-4 gap-3 text-left hover:bg-[#0f0f0f] transition"
                    >
                      <Logo src={h.logo} symbol={h.symbol} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="text-ink text-base truncate">{h.name}</div>
                        <div className="text-muted text-sm tnum">
                          {h.symbol} · {fmtShares(h.shares)} sh
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-ink text-base tnum">
                          {h.livePrice !== null ? fmtMoney(h.livePrice) : fmtMoney(h.costBasis)}
                        </div>
                        <div className={`text-sm tnum ${dayColor}`}>
                          {h.livePrice !== null ? fmtPct(h.dayChangePct) : "—"}
                        </div>
                      </div>
                    </button>
                  </SwipeRow>
                </li>
              );
            })}
          </ul>
        )}

        {realized.length > 0 && (
          <div className="mt-8 px-6 pb-6">
            <div className="flex items-baseline justify-between mb-3 border-t border-border pt-5">
              <div className="text-muted text-xs uppercase tracking-wide">Realized gains</div>
              <div
                className={`tnum text-sm ${
                  realizedTotal > 0
                    ? "text-gain"
                    : realizedTotal < 0
                      ? "text-loss"
                      : "text-muted"
                }`}
              >
                {fmtMoney(realizedTotal, { showSign: true })}
              </div>
            </div>
            <ul className="space-y-2">
              {[...realized]
                .sort((a, b) => b.soldAt - a.soldAt)
                .map((t) => {
                  const color =
                    t.realizedGain > 0
                      ? "text-gain"
                      : t.realizedGain < 0
                        ? "text-loss"
                        : "text-muted";
                  return (
                    <li key={t.id} className="flex items-baseline justify-between text-sm">
                      <span className="text-ink">
                        <span className="font-semibold">{t.symbol}</span>
                        <span className="text-muted text-xs ml-2 tnum">
                          {fmtShares(t.shares)} sh · {fmtDate(t.soldAt)}
                        </span>
                      </span>
                      <span className={`tnum ${color}`}>
                        {fmtMoney(t.realizedGain, { showSign: true })}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </div>

      {!(sheetOpen || showOnboarding) && (
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Add holding"
          className="absolute right-5 bottom-24 z-20 w-14 h-14 rounded-full bg-ink text-bg flex items-center justify-center shadow-lg shadow-black/40 hover:scale-105 active:scale-95 transition animate-fade-in"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      <AddHoldingSheet
        open={sheetOpen || showOnboarding}
        onClose={handleClose}
        onAdd={handleAdd}
        firstTime={showOnboarding}
        prefillSymbol={prefillSymbol}
      />

      <SellSheet
        open={!!sellingSymbol}
        onClose={() => setSellingSymbol(null)}
        holding={sellingHolding}
        currentPrice={sellingHolding ? prices[sellingHolding.symbol]?.price ?? null : null}
        onConfirm={(shares, salePrice) => {
          if (sellingSymbol) onSell(sellingSymbol, shares, salePrice);
        }}
      />
    </div>
  );
}
