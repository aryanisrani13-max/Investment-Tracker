import { supabase } from './supabase';
import type {
  Goal,
  Holding,
  JournalEntry,
  Milestone,
  MilestoneId,
  RealizedTrade,
  Snapshot,
  WatchlistItem,
} from './types';

// ─── Holdings ───────────────────────────────────────────────────────────────

export const storage = {
  async getHoldings(): Promise<Holding[]> {
    const { data, error } = await supabase.from('holdings').select('*').order('created_at');
    if (error) { console.error(error); return []; }
    return (data ?? []).map((r: Record<string, unknown>) => ({
      symbol: r.symbol as string,
      name: (r.name ?? r.symbol) as string,
      shares: Number(r.shares),
      costBasis: Number(r.avg_cost),
      logo: (r.logo ?? undefined) as string | undefined,
      addedAt: new Date(r.created_at as string).getTime(),
    }));
  },

  async setHoldings(holdings: Holding[]): Promise<void> {
    await supabase.from('holdings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (holdings.length === 0) return;
    const rows = holdings.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      shares: h.shares,
      avg_cost: h.costBasis,
      logo: h.logo ?? null,
    }));
    const { error } = await supabase.from('holdings').insert(rows);
    if (error) console.error(error);
  },

  // ─── Snapshots ────────────────────────────────────────────────────────────

  async getSnapshots(): Promise<Snapshot[]> {
    const { data, error } = await supabase.from('snapshots').select('*').order('t');
    if (error) { console.error(error); return []; }
    return (data ?? []).map((r: Record<string, unknown>) => ({ t: Number(r.t), v: Number(r.value) }));
  },

  async setSnapshots(snapshots: Snapshot[]): Promise<void> {
    await supabase.from('snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (snapshots.length === 0) return;
    const rows = snapshots.map((s) => ({ t: s.t, value: s.v }));
    const { error } = await supabase.from('snapshots').insert(rows);
    if (error) console.error(error);
  },

  async appendSnapshot(s: Snapshot): Promise<Snapshot[]> {
    const list = await storage.getSnapshots();
    const last = list[list.length - 1];
    if (last && s.t - last.t < 60_000) {
      list[list.length - 1] = s;
    } else {
      list.push(s);
    }
    if (list.length > 5000) list.splice(0, list.length - 5000);
    await storage.setSnapshots(list);
    return list;
  },

  // ─── Goal ─────────────────────────────────────────────────────────────────

  async getGoal(): Promise<Goal | null> {
    const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false }).limit(1);
    if (error || !data || data.length === 0) return null;
    return { amount: Number(data[0].target), note: data[0].label ?? '' };
  },

  async setGoal(g: Goal): Promise<void> {
    await supabase.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error } = await supabase.from('goals').insert({ target: g.amount, label: g.note });
    if (error) console.error(error);
  },

  // ─── App opened (keep in memory — trivial flag) ───────────────────────────

  _opened: false,
  hasOpened(): boolean { return storage._opened; },
  markOpened(): void { storage._opened = true; },

  // ─── Starting value (localStorage fallback — not critical) ───────────────

  getStartingValue(): number {
    try { return Number(localStorage.getItem('portfolio-starting-value') ?? '1000') || 1000; } catch { return 1000; }
  },
  setStartingValue(n: number): void {
    try { localStorage.setItem('portfolio-starting-value', String(n)); } catch {}
  },

  // ─── Learn / Research caches (localStorage — ephemeral, not critical) ────

  getLearnCache(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem('learn-topic-cache') ?? '{}'); } catch { return {}; }
  },
  setLearnCache(cache: Record<string, string>): void {
    try { localStorage.setItem('learn-topic-cache', JSON.stringify(cache)); } catch {}
  },
  getResearchCache(): Record<string, unknown> {
    try { return JSON.parse(localStorage.getItem('research-cache') ?? '{}'); } catch { return {}; }
  },
  setResearchCache(cache: Record<string, unknown>): void {
    try { localStorage.setItem('research-cache', JSON.stringify(cache)); } catch {}
  },

  // ─── Watchlist ────────────────────────────────────────────────────────────

  async getWatchlist(): Promise<WatchlistItem[]> {
    const { data, error } = await supabase.from('watchlist').select('*').order('added_at');
    if (error) { console.error(error); return []; }
    return (data ?? []).map((r: Record<string, unknown>) => ({
      symbol: r.symbol as string,
      name: (r.name ?? r.symbol) as string,
      logo: (r.logo ?? undefined) as string | undefined,
      note: (r.note ?? '') as string,
      addedAt: new Date(r.added_at as string).getTime(),
    }));
  },

  async setWatchlist(list: WatchlistItem[]): Promise<void> {
    await supabase.from('watchlist').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (list.length === 0) return;
    const rows = list.map((w) => ({
      symbol: w.symbol,
      name: w.name,
      logo: w.logo ?? null,
      note: w.note,
    }));
    const { error } = await supabase.from('watchlist').insert(rows);
    if (error) console.error(error);
  },

  // ─── Journal ──────────────────────────────────────────────────────────────

  async getJournal(): Promise<JournalEntry[]> {
    const { data, error } = await supabase.from('journal').select('*').order('t');
    if (error) { console.error(error); return []; }
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      t: Number(r.t),
      symbol: (r.symbol ?? undefined) as string | undefined,
      action: (r.action ?? undefined) as string | undefined,
      title: r.title as string,
      body: r.body as string,
    }));
  },

  async appendJournal(entry: JournalEntry): Promise<JournalEntry[]> {
    const { error } = await supabase.from('journal').insert({
      id: entry.id,
      t: entry.t,
      symbol: entry.symbol ?? null,
      action: entry.action ?? null,
      title: entry.title,
      body: entry.body,
    });
    if (error) console.error(error);
    return storage.getJournal();
  },

  async setJournal(list: JournalEntry[]): Promise<void> {
    await supabase.from('journal').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (list.length === 0) return;
    const rows = list.map((e) => ({
      id: e.id, t: e.t, symbol: e.symbol ?? null,
      action: e.action ?? null, title: e.title, body: e.body,
    }));
    const { error } = await supabase.from('journal').insert(rows);
    if (error) console.error(error);
  },

  // ─── Milestones (localStorage — device-local celebrations are fine) ───────

  getMilestones(): Milestone[] {
    try { return JSON.parse(localStorage.getItem('milestones') ?? '[]'); } catch { return []; }
  },
  hasMilestone(id: MilestoneId): boolean {
    return storage.getMilestones().some((m) => m.id === id);
  },
  markMilestone(id: MilestoneId): Milestone | null {
    if (storage.hasMilestone(id)) return null;
    const m: Milestone = { id, reachedAt: Date.now() };
    const list = storage.getMilestones();
    list.push(m);
    try { localStorage.setItem('milestones', JSON.stringify(list)); } catch {}
    return m;
  },

  // ─── Realized trades ──────────────────────────────────────────────────────

  async getRealized(): Promise<RealizedTrade[]> {
    const { data, error } = await supabase.from('realized_trades').select('*').order('sold_at');
    if (error) { console.error(error); return []; }
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      symbol: r.symbol as string,
      name: (r.name ?? r.symbol) as string,
      shares: Number(r.shares),
      salePrice: Number(r.sell_price),
      costBasis: Number(r.buy_price),
      soldAt: new Date(r.sold_at as string).getTime(),
      realizedGain: Number(r.realized_gain ?? 0),
    }));
  },

  async appendRealized(t: RealizedTrade): Promise<RealizedTrade[]> {
    const { error } = await supabase.from('realized_trades').insert({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      shares: t.shares,
      sell_price: t.salePrice,
      buy_price: t.costBasis,
      realized_gain: t.realizedGain,
    });
    if (error) console.error(error);
    return storage.getRealized();
  },

  // ─── Daily briefing cache (localStorage — ephemeral) ─────────────────────

  getBriefing(dateKey: string): string | null {
    try { return localStorage.getItem(`briefing-${dateKey}`); } catch { return null; }
  },
  setBriefing(dateKey: string, text: string): void {
    try { localStorage.setItem(`briefing-${dateKey}`, text); } catch {}
  },
};

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
