import type {
  Goal,
  Holding,
  JournalEntry,
  Milestone,
  MilestoneId,
  RealizedTrade,
  Snapshot,
  WatchlistItem,
} from "./types";

const KEYS = {
  holdings: "portfolio-holdings",
  snapshots: "portfolio-snapshots",
  goal: "investment-goal",
  appOpened: "app-opened",
  startingValue: "portfolio-starting-value",
  learnCache: "learn-topic-cache",
  researchCache: "research-cache",
  watchlist: "watchlist",
  journal: "journal",
  milestones: "milestones",
  realized: "realized-trades",
  briefingPrefix: "briefing-",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — silently ignore
  }
}

export const storage = {
  getHoldings(): Holding[] {
    return read<Holding[]>(KEYS.holdings, []);
  },
  setHoldings(h: Holding[]): void {
    write(KEYS.holdings, h);
  },
  getSnapshots(): Snapshot[] {
    return read<Snapshot[]>(KEYS.snapshots, []);
  },
  setSnapshots(s: Snapshot[]): void {
    write(KEYS.snapshots, s);
  },
  appendSnapshot(s: Snapshot): Snapshot[] {
    const list = storage.getSnapshots();
    // Coalesce: if last snapshot is within 60s, replace it instead of stacking
    const last = list[list.length - 1];
    if (last && s.t - last.t < 60_000) {
      list[list.length - 1] = s;
    } else {
      list.push(s);
    }
    // Keep at most ~5000 snapshots
    if (list.length > 5000) list.splice(0, list.length - 5000);
    storage.setSnapshots(list);
    return list;
  },
  getGoal(): Goal | null {
    return read<Goal | null>(KEYS.goal, null);
  },
  setGoal(g: Goal): void {
    write(KEYS.goal, g);
  },
  hasOpened(): boolean {
    return read<boolean>(KEYS.appOpened, false);
  },
  markOpened(): void {
    write(KEYS.appOpened, true);
  },
  getStartingValue(): number {
    return read<number>(KEYS.startingValue, 1000);
  },
  setStartingValue(n: number): void {
    write(KEYS.startingValue, n);
  },
  getLearnCache(): Record<string, string> {
    return read<Record<string, string>>(KEYS.learnCache, {});
  },
  setLearnCache(cache: Record<string, string>): void {
    write(KEYS.learnCache, cache);
  },
  getResearchCache(): Record<string, unknown> {
    return read<Record<string, unknown>>(KEYS.researchCache, {});
  },
  setResearchCache(cache: Record<string, unknown>): void {
    write(KEYS.researchCache, cache);
  },

  getWatchlist(): WatchlistItem[] {
    return read<WatchlistItem[]>(KEYS.watchlist, []);
  },
  setWatchlist(list: WatchlistItem[]): void {
    write(KEYS.watchlist, list);
  },

  getJournal(): JournalEntry[] {
    return read<JournalEntry[]>(KEYS.journal, []);
  },
  appendJournal(entry: JournalEntry): JournalEntry[] {
    const list = storage.getJournal();
    list.push(entry);
    storage.setJournal(list);
    return list;
  },
  setJournal(list: JournalEntry[]): void {
    write(KEYS.journal, list);
  },

  getMilestones(): Milestone[] {
    return read<Milestone[]>(KEYS.milestones, []);
  },
  hasMilestone(id: MilestoneId): boolean {
    return storage.getMilestones().some((m) => m.id === id);
  },
  markMilestone(id: MilestoneId): Milestone | null {
    if (storage.hasMilestone(id)) return null;
    const m: Milestone = { id, reachedAt: Date.now() };
    const list = storage.getMilestones();
    list.push(m);
    write(KEYS.milestones, list);
    return m;
  },

  getRealized(): RealizedTrade[] {
    return read<RealizedTrade[]>(KEYS.realized, []);
  },
  appendRealized(t: RealizedTrade): RealizedTrade[] {
    const list = storage.getRealized();
    list.push(t);
    write(KEYS.realized, list);
    return list;
  },

  getBriefing(dateKey: string): string | null {
    return read<string | null>(`${KEYS.briefingPrefix}${dateKey}`, null);
  },
  setBriefing(dateKey: string, text: string): void {
    write(`${KEYS.briefingPrefix}${dateKey}`, text);
  },
};

/** YYYYMMDD in the user's local timezone — used to key the daily briefing cache */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
