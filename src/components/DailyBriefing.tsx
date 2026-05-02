import { useEffect, useState } from "react";
import { fetchDailyBriefing } from "../lib/claude";
import { computeStats } from "../lib/portfolio";
import { storage, todayKey } from "../lib/storage";
import type { Holding, LivePrice } from "../lib/types";

/**
 * Italic grey morning briefing with a thin white left border. Cached per day
 * in localStorage; only refetches when the date key changes.
 */
export function DailyBriefing({
  holdings,
  prices,
}: {
  holdings: Holding[];
  prices: Record<string, LivePrice>;
}) {
  const [text, setText] = useState<string | null>(() => storage.getBriefing(todayKey()));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (text || loading) return;
    setLoading(true);
    const { stats } = computeStats(holdings, prices);
    fetchDailyBriefing(holdings, prices, stats.totalGainPct)
      .then((t) => {
        setText(t);
        storage.setBriefing(todayKey(), t);
      })
      .finally(() => setLoading(false));
  }, [text, loading, holdings, prices]);

  if (loading && !text) {
    return (
      <div className="border-l border-ink/40 pl-3 mx-6 my-4">
        <div className="text-muted italic text-sm">Generating today's briefing…</div>
      </div>
    );
  }
  if (!text) return null;

  return (
    <div className="border-l border-ink pl-3 mx-6 my-4">
      <div className="text-muted italic text-sm leading-relaxed whitespace-pre-line">{text}</div>
    </div>
  );
}
