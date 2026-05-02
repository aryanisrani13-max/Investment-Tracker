import { useEffect, useState } from "react";
import { BottomSheet } from "../components/BottomSheet";
import { fmtDate, fmtMoney, fmtPct } from "../lib/format";
import type { Goal, Snapshot } from "../lib/types";

export function GoalsTab({
  goal,
  setGoal,
  currentValue,
  startingValue,
  snapshots,
}: {
  goal: Goal | null;
  setGoal: (g: Goal) => void;
  currentValue: number;
  startingValue: number;
  snapshots: Snapshot[];
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(goal ? String(goal.amount) : "");
  const [note, setNote] = useState(goal?.note ?? "");

  useEffect(() => {
    if (editing) {
      setAmount(goal ? String(goal.amount) : "");
      setNote(goal?.note ?? "");
    }
  }, [editing, goal]);

  function save() {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setGoal({ amount: amt, note: note.trim() });
    setEditing(false);
  }

  if (!goal) {
    return (
      <div className="flex flex-col h-full">
        <header className="px-6 pt-12 pb-4 flex justify-end">
          <button
            onClick={() => setEditing(true)}
            className="text-ink text-sm font-medium"
          >
            Edit
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center pb-28">
          <button
            onClick={() => setEditing(true)}
            className="text-muted text-base hover:text-ink transition"
          >
            Set a goal
          </button>
        </div>
        <EditSheet
          open={editing}
          amount={amount}
          note={note}
          setAmount={setAmount}
          setNote={setNote}
          onSave={save}
          onClose={() => setEditing(false)}
        />
      </div>
    );
  }

  const pct = Math.min(100, (currentValue / goal.amount) * 100);
  const eta = estimateEta(currentValue, goal.amount, startingValue, snapshots);

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 pt-12 pb-4 flex justify-end">
        <button
          onClick={() => setEditing(true)}
          className="text-ink text-sm font-medium"
        >
          Edit
        </button>
      </header>

      <div className="px-6 pb-28">
        <div className="text-hero tnum text-ink">{fmtMoney(goal.amount, { decimals: 0 })}</div>
        <div className="text-muted text-sm mt-1">Goal</div>

        <div className="mt-8">
          <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gain transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-ink tnum">{fmtMoney(currentValue)}</span>
            <span className="text-muted tnum">{fmtPct(pct, { showSign: false })} of goal</span>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <Row label="Remaining" value={fmtMoney(Math.max(0, goal.amount - currentValue))} />
          <Row label="Starting amount" value={fmtMoney(startingValue)} />
          <Row label="Estimated reach date" value={eta} muted />
        </div>

        {goal.note && (
          <div className="mt-10 italic text-muted text-sm leading-relaxed">{goal.note}</div>
        )}
      </div>

      <EditSheet
        open={editing}
        amount={amount}
        note={note}
        setAmount={setAmount}
        setNote={setNote}
        onSave={save}
        onClose={() => setEditing(false)}
      />
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-sm">{label}</span>
      <span className={`tnum text-sm ${muted ? "text-muted" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function EditSheet({
  open,
  amount,
  note,
  setAmount,
  setNote,
  onSave,
  onClose,
}: {
  open: boolean;
  amount: string;
  note: string;
  setAmount: (s: string) => void;
  setNote: (s: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Goal">
      <label className="block text-muted text-xs uppercase tracking-wide mb-1">Target amount</label>
      <input
        autoFocus
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        placeholder="1500"
        className="w-full bg-[#1a1a1a] text-ink placeholder:text-muted px-4 py-3 rounded-xl text-base mb-4 tnum"
      />
      <label className="block text-muted text-xs uppercase tracking-wide mb-1">Personal note</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Why this goal matters to you"
        className="w-full bg-[#1a1a1a] text-ink placeholder:text-muted px-4 py-3 rounded-xl text-base mb-6 resize-none"
      />
      <button
        onClick={onSave}
        disabled={!amount}
        className="w-full py-3 rounded-full bg-ink text-bg text-sm font-semibold disabled:opacity-40"
      >
        Save
      </button>
    </BottomSheet>
  );
}

/**
 * Estimate the date the goal will be reached using the user's actual growth
 * rate over the longest snapshot window we have. Falls back to "—" if there
 * isn't enough data or growth is flat/negative.
 */
function estimateEta(
  current: number,
  target: number,
  startingValue: number,
  snapshots: Snapshot[]
): string {
  if (current >= target) return "Reached";
  if (snapshots.length < 2) return "Need more data";
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const elapsedDays = Math.max(1, (last.t - first.t) / (1000 * 60 * 60 * 24));
  const startV = first.v || startingValue;
  if (startV <= 0 || last.v <= startV) return "Need more growth";
  const dailyRate = Math.pow(last.v / startV, 1 / elapsedDays) - 1;
  if (dailyRate <= 0) return "Need more growth";
  const daysToGoal = Math.log(target / current) / Math.log(1 + dailyRate);
  if (!Number.isFinite(daysToGoal) || daysToGoal > 365 * 50) return "Far away";
  return fmtDate(Date.now() + daysToGoal * 24 * 60 * 60 * 1000);
}
