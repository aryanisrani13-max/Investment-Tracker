import { useState } from "react";
import { fmtDate } from "../lib/format";
import type { JournalEntry, Milestone, MilestoneId } from "../lib/types";

const MILESTONE_LABELS: Record<MilestoneId, string> = {
  "first-trade": "First trade placed",
  "first-50-gain": "First $50 in gains",
  "up-5-percent": "Portfolio up 5%",
  "up-10-percent": "Portfolio up 10%",
};

export function JournalTab({
  entries,
  milestones,
  onAddEntry,
}: {
  entries: JournalEntry[];
  milestones: Milestone[];
  onAddEntry: (body: string) => void;
}) {
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");

  function submit() {
    const text = draft.trim();
    if (!text) {
      setComposing(false);
      return;
    }
    onAddEntry(text);
    setDraft("");
    setComposing(false);
  }

  const sorted = [...entries].sort((a, b) => b.t - a.t);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-28">
      <header className="px-6 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-ink text-2xl font-semibold">Journal</h1>
        <button
          onClick={() => setComposing((v) => !v)}
          className="text-ink text-sm font-medium"
        >
          {composing ? "Cancel" : "+ Entry"}
        </button>
      </header>

      {composing && (
        <div className="px-6 mb-4">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="What's on your mind today?"
            className="w-full bg-[#1a1a1a] text-ink placeholder:text-muted px-4 py-3 rounded-xl text-sm resize-none mb-2"
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            className="px-4 py-2 rounded-full bg-ink text-bg text-xs font-semibold disabled:opacity-40"
          >
            Save
          </button>
        </div>
      )}

      {sorted.length === 0 && !composing && (
        <div className="px-6 py-16 text-center text-muted text-sm">
          Trades and notes you make will appear here as a clean, dated feed.
        </div>
      )}

      <ul>
        {sorted.map((e) => (
          <li key={e.id} className="border-b border-border last:border-b-0 px-6 py-4">
            <div className="text-muted text-xs mb-1">
              {fmtDate(e.t)}
              {e.action && (
                <span className="ml-2 uppercase tracking-wide">
                  {e.action}
                </span>
              )}
            </div>
            <div className="text-ink text-sm leading-relaxed">
              {e.symbol && <span className="font-semibold">{e.symbol} · </span>}
              {e.body}
            </div>
          </li>
        ))}
      </ul>

      {milestones.length > 0 && (
        <div className="mt-8 px-6 border-t border-border pt-6">
          <div className="text-muted text-xs uppercase tracking-wide mb-3">Milestones</div>
          <ul className="space-y-2">
            {[...milestones]
              .sort((a, b) => b.reachedAt - a.reachedAt)
              .map((m) => (
                <li key={m.id} className="flex items-baseline justify-between text-sm">
                  <span className="italic text-muted">{MILESTONE_LABELS[m.id]}</span>
                  <span className="text-muted text-xs tnum">{fmtDate(m.reachedAt)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
