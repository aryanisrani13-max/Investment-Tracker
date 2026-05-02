import { useCallback, useEffect, useRef, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { MobileShell } from "./components/MobileShell";
import { MoreSheet } from "./components/MoreSheet";
import { StockDetail } from "./components/StockDetail";
import { finnhub } from "./lib/finnhub";
import { computeStats } from "./lib/portfolio";
import { storage } from "./lib/storage";
import type {
  Goal,
  Holding,
  JournalEntry,
  LivePrice,
  Milestone,
  MilestoneId,
  RealizedTrade,
  Snapshot,
  TabId,
  WatchlistItem,
} from "./lib/types";
import { GoalsTab } from "./tabs/GoalsTab";
import { JournalTab } from "./tabs/JournalTab";
import { LearnTab } from "./tabs/LearnTab";
import { PortfolioTab } from "./tabs/PortfolioTab";
import { ProgressTab } from "./tabs/ProgressTab";
import { ResearchTab } from "./tabs/ResearchTab";
import { WatchlistTab } from "./tabs/WatchlistTab";

const AUTO_REFRESH_MS = 60_000;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [tab, setTab] = useState<TabId>("portfolio");
  const [holdings, setHoldings] = useState<Holding[]>(() => storage.getHoldings());
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => storage.getSnapshots());
  const [goal, setGoalState] = useState<Goal | null>(() => storage.getGoal());
  const [journal, setJournal] = useState<JournalEntry[]>(() => storage.getJournal());
  const [milestones, setMilestones] = useState<Milestone[]>(() => storage.getMilestones());
  const [realized, setRealized] = useState<RealizedTrade[]>(() => storage.getRealized());
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [onboarding, setOnboarding] = useState<boolean>(() => !storage.hasOpened());
  const [startingValue] = useState(() => storage.getStartingValue());
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [prefillSymbol, setPrefillSymbol] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const tickRerender = useState(0)[1]; // forces "Updated Xs ago" to refresh

  // Persist holdings whenever they change
  useEffect(() => {
    storage.setHoldings(holdings);
  }, [holdings]);

  // Refresh prices for all holdings
  const refresh = useCallback(async () => {
    if (holdings.length === 0) {
      setLastUpdated(Date.now());
      return;
    }
    setRefreshing(true);
    try {
      const fresh = await finnhub.quoteMany(holdings.map((h) => h.symbol));
      const map: Record<string, LivePrice> = { ...prices };
      for (const q of fresh) map[q.symbol] = q;
      setPrices(map);
      setLastUpdated(Date.now());

      // Snapshot the current portfolio value
      const { stats } = computeStats(holdings, map);
      if (stats.totalValue > 0) {
        const next = storage.appendSnapshot({ t: Date.now(), v: stats.totalValue });
        setSnapshots(next);
      }
      checkMilestones(stats.totalGain, stats.totalGainPct, holdings.length);
    } catch {
      // swallow — UI shows last good prices
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings]);

  // Initial fetch + auto-refresh every minute
  useEffect(() => {
    refresh();
    if (refreshTimer.current) window.clearInterval(refreshTimer.current);
    refreshTimer.current = window.setInterval(refresh, AUTO_REFRESH_MS);
    return () => {
      if (refreshTimer.current) window.clearInterval(refreshTimer.current);
    };
  }, [refresh]);

  // Re-render every 10s so "Updated Xs ago" stays fresh
  useEffect(() => {
    const id = window.setInterval(() => tickRerender((n) => n + 1), 10_000);
    return () => window.clearInterval(id);
  }, [tickRerender]);

  // First-launch flag
  useEffect(() => {
    if (!storage.hasOpened()) storage.markOpened();
  }, []);

  function appendJournal(partial: Omit<JournalEntry, "id" | "t"> & { t?: number }): void {
    const entry: JournalEntry = {
      id: newId(),
      t: partial.t ?? Date.now(),
      symbol: partial.symbol,
      action: partial.action,
      title: partial.title,
      body: partial.body,
    };
    storage.appendJournal(entry);
    setJournal((curr) => [...curr, entry]);
  }

  function checkMilestones(totalGain: number, totalGainPct: number, holdingsCount: number) {
    const fired: MilestoneId[] = [];
    if (holdingsCount > 0 && !storage.hasMilestone("first-trade")) fired.push("first-trade");
    if (totalGain >= 50 && !storage.hasMilestone("first-50-gain")) fired.push("first-50-gain");
    if (totalGainPct >= 5 && !storage.hasMilestone("up-5-percent")) fired.push("up-5-percent");
    if (totalGainPct >= 10 && !storage.hasMilestone("up-10-percent")) fired.push("up-10-percent");
    if (fired.length === 0) return;
    for (const id of fired) {
      const m = storage.markMilestone(id);
      if (m) setMilestones((curr) => [...curr, m]);
    }
  }

  function addHolding(h: Holding) {
    let isNew = true;
    setHoldings((curr) => {
      // If symbol exists, fold shares in (weighted average cost basis)
      const existing = curr.find((x) => x.symbol === h.symbol);
      if (existing) {
        isNew = false;
        const totalShares = existing.shares + h.shares;
        const newCost =
          (existing.shares * existing.costBasis + h.shares * h.costBasis) / totalShares;
        return curr.map((x) =>
          x.symbol === h.symbol ? { ...x, shares: totalShares, costBasis: newCost, logo: x.logo || h.logo } : x
        );
      }
      return [...curr, h];
    });
    appendJournal({
      symbol: h.symbol,
      action: "bought",
      title: `Bought ${h.shares} ${h.symbol}`,
      body: isNew
        ? `Bought ${h.shares} shares of ${h.symbol} at $${h.costBasis.toFixed(2)}.`
        : `Added ${h.shares} more shares of ${h.symbol} at $${h.costBasis.toFixed(2)}.`,
    });
    // refresh in the background to grab the new price
    setTimeout(refresh, 50);
  }

  function removeHolding(symbol: string) {
    const removed = holdings.find((h) => h.symbol === symbol);
    setHoldings((curr) => curr.filter((h) => h.symbol !== symbol));
    if (removed) {
      appendJournal({
        symbol,
        action: "sold",
        title: `Removed ${symbol}`,
        body: `Removed ${symbol} from the portfolio.`,
      });
    }
  }

  function sellHolding(symbol: string, sharesToSell: number, salePrice: number) {
    const holding = holdings.find((h) => h.symbol === symbol);
    if (!holding) return;
    const sold = Math.min(sharesToSell, holding.shares);
    const realizedGain = (salePrice - holding.costBasis) * sold;
    const trade: RealizedTrade = {
      id: newId(),
      symbol: holding.symbol,
      name: holding.name,
      shares: sold,
      salePrice,
      costBasis: holding.costBasis,
      soldAt: Date.now(),
      realizedGain,
    };
    storage.appendRealized(trade);
    setRealized((curr) => [...curr, trade]);

    if (sold >= holding.shares) {
      // Selling everything — drop the holding
      setHoldings((curr) => curr.filter((h) => h.symbol !== symbol));
    } else {
      // Partial sell — keep cost basis, reduce shares
      setHoldings((curr) =>
        curr.map((h) =>
          h.symbol === symbol ? { ...h, shares: h.shares - sold } : h
        )
      );
    }

    appendJournal({
      symbol,
      action: "sold",
      title: `Sold ${sold} ${symbol}`,
      body: `Sold ${sold} shares of ${symbol} at $${salePrice.toFixed(2)}. Realized ${realizedGain >= 0 ? "+" : ""}$${realizedGain.toFixed(2)}.`,
    });
  }

  function setGoal(g: Goal) {
    setGoalState(g);
    storage.setGoal(g);
  }

  function handleAddFromWatchlist(item: WatchlistItem) {
    setPrefillSymbol(item.symbol);
    setTab("portfolio");
    // The PortfolioTab's AddHoldingSheet picks up prefillSymbol via prop.
  }

  const { stats } = computeStats(holdings, prices);
  const detailHolding = detailSymbol ? holdings.find((h) => h.symbol === detailSymbol) : null;

  return (
    <MobileShell>
      <main className="flex-1 flex flex-col overflow-hidden">
        {tab === "portfolio" && (
          <PortfolioTab
            holdings={holdings}
            prices={prices}
            realized={realized}
            lastUpdated={lastUpdated}
            refreshing={refreshing}
            onRefresh={refresh}
            onAdd={addHolding}
            onSell={sellHolding}
            onOpenDetail={(s) => setDetailSymbol(s)}
            onOpenMore={() => setMoreOpen(true)}
            showOnboarding={onboarding && holdings.length === 0}
            dismissOnboarding={() => setOnboarding(false)}
            prefillSymbol={prefillSymbol}
            consumePrefill={() => setPrefillSymbol(null)}
          />
        )}
        {tab === "progress" && (
          <ProgressTab
            snapshots={snapshots}
            holdings={holdings}
            prices={prices}
            startingValue={startingValue}
          />
        )}
        {tab === "research" && <ResearchTab />}
        {tab === "watchlist" && <WatchlistTab onAddToPortfolio={handleAddFromWatchlist} />}
        {tab === "journal" && (
          <JournalTab
            entries={journal}
            milestones={milestones}
            onAddEntry={(body) =>
              appendJournal({ action: "note", title: "Note", body })
            }
          />
        )}
        {tab === "goals" && (
          <GoalsTab
            goal={goal}
            setGoal={setGoal}
            currentValue={stats.totalValue}
            startingValue={startingValue}
            snapshots={snapshots}
          />
        )}
        {tab === "learn" && <LearnTab />}
      </main>
      {detailHolding && (
        <StockDetail
          symbol={detailHolding.symbol}
          name={detailHolding.name}
          shares={detailHolding.shares}
          costBasis={detailHolding.costBasis}
          livePrice={prices[detailHolding.symbol] ?? null}
          onBack={() => setDetailSymbol(null)}
          onDeleteForever={() => {
            removeHolding(detailHolding.symbol);
            setDetailSymbol(null);
          }}
        />
      )}
      <BottomNav active={tab} onChange={setTab} />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onPick={(id) => setTab(id)}
      />
    </MobileShell>
  );
}
