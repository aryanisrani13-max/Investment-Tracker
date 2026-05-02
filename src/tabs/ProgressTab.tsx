import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney, fmtPct } from "../lib/format";
import { computeStats } from "../lib/portfolio";
import type { Holding, LivePrice, Snapshot, TimeRange } from "../lib/types";

const RANGES: { id: TimeRange; ms: number | null }[] = [
  { id: "1D", ms: 24 * 60 * 60 * 1000 },
  { id: "7D", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "3W", ms: 21 * 24 * 60 * 60 * 1000 },
  { id: "1M", ms: 30 * 24 * 60 * 60 * 1000 },
  { id: "ALL", ms: null },
];

export function ProgressTab({
  snapshots,
  holdings,
  prices,
  startingValue,
}: {
  snapshots: Snapshot[];
  holdings: Holding[];
  prices: Record<string, LivePrice>;
  startingValue: number;
}) {
  const [range, setRange] = useState<TimeRange>("ALL");
  const [scrub, setScrub] = useState<Snapshot | null>(null);
  const { stats } = computeStats(holdings, prices);
  const hasHoldings = holdings.length > 0;

  const filtered = useMemo(() => {
    const cutoff = RANGES.find((r) => r.id === range)?.ms;
    const min = cutoff ? Date.now() - cutoff : 0;
    let series = snapshots.filter((s) => s.t >= min);
    // Always include the live current value as the last point
    if (stats.totalValue > 0) {
      const now = Date.now();
      const last = series[series.length - 1];
      if (!last || now - last.t > 5_000) {
        series = [...series, { t: now, v: stats.totalValue }];
      }
    }
    return series;
  }, [snapshots, range, stats.totalValue]);

  const isUp = filtered.length > 1 ? filtered[filtered.length - 1].v >= filtered[0].v : stats.totalGain >= 0;
  const lineColor = isUp ? "#00c805" : "#ff5000";

  // The "headline" is either the scrubbed point or the latest value (live or last snapshot)
  const lastSnapshotValue = filtered.length ? filtered[filtered.length - 1].v : 0;
  const headlineValue = scrub?.v ?? (stats.totalValue > 0 ? stats.totalValue : lastSnapshotValue);
  const baseline = filtered[0]?.v ?? startingValue;
  const displayDelta = headlineValue - baseline;
  const displayPct = baseline > 0 ? (displayDelta / baseline) * 100 : 0;
  const deltaColor =
    !hasHoldings
      ? "text-muted"
      : displayDelta > 0
        ? "text-gain"
        : displayDelta < 0
          ? "text-loss"
          : "text-muted";

  const yMin = filtered.length ? Math.min(...filtered.map((s) => s.v)) : 0;
  const yMax = filtered.length ? Math.max(...filtered.map((s) => s.v)) : 1;
  const yPad = (yMax - yMin) * 0.1 || 1;

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 pt-12 pb-2">
        <div className="text-hero tnum text-ink">{fmtMoney(headlineValue)}</div>
        <div className={`mt-2 text-sm tnum ${deltaColor}`}>
          {hasHoldings || scrub ? (
            <>
              {fmtMoney(displayDelta, { showSign: true })}{" "}
              <span className="ml-1">({fmtPct(displayPct)})</span>
            </>
          ) : (
            <span className="text-muted">No holdings yet</span>
          )}
          {scrub && (
            <span className="text-muted ml-2">
              {new Date(scrub.t).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </header>

      <div
        className="h-[260px] mt-2 select-none"
        onPointerLeave={() => setScrub(null)}
      >
        {filtered.length < 2 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm px-6 text-center">
            Open the app over a few days to grow your chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filtered}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              onMouseMove={(state) => {
                const ap = state?.activePayload?.[0]?.payload as Snapshot | undefined;
                if (ap) setScrub(ap);
              }}
              onMouseLeave={() => setScrub(null)}
            >
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide domain={["dataMin", "dataMax"]} type="number" />
              <YAxis hide domain={[yMin - yPad, yMax + yPad]} />
              <Tooltip
                cursor={{ stroke: "#ffffff", strokeWidth: 1, strokeDasharray: "0" }}
                content={() => null}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#areaFill)"
                isAnimationActive={false}
                activeDot={false}
                dot={false}
              />
              {scrub && (
                <ReferenceDot
                  x={scrub.t}
                  y={scrub.v}
                  r={4}
                  fill={lineColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                  isFront
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex justify-between px-6 mt-4">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition ${
              range === r.id ? "text-ink bg-[#1a1a1a]" : "text-muted"
            }`}
          >
            {r.id}
          </button>
        ))}
      </div>

      <div className="px-6 mt-8 pb-28">
        <div className="grid grid-cols-2 gap-y-5 gap-x-6">
          <Stat label="Started with" value={fmtMoney(startingValue)} />
          <Stat label="Current value" value={fmtMoney(stats.totalValue)} />
          <Stat
            label="Total gain"
            value={hasHoldings ? fmtMoney(stats.totalGain, { showSign: true }) : "—"}
            color={signColor(hasHoldings ? stats.totalGain : null)}
          />
          <Stat
            label="Return"
            value={hasHoldings ? fmtPct(stats.totalGainPct) : "—"}
            color={signColor(hasHoldings ? stats.totalGain : null)}
          />
          <Stat
            label="Best performer"
            value={stats.best ? `${stats.best.symbol} ${fmtPct(stats.best.gainPct)}` : "—"}
            color={signColor(stats.best?.gainPct ?? null)}
          />
          <Stat
            label="Worst performer"
            value={stats.worst ? `${stats.worst.symbol} ${fmtPct(stats.worst.gainPct)}` : "—"}
            color={signColor(stats.worst?.gainPct ?? null)}
          />
        </div>

        {hasHoldings && (
          <div className="mt-8 text-muted text-sm">{encouragement(stats.totalGainPct)}</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-ink" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-muted text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className={`tnum text-base ${color}`}>{value}</div>
    </div>
  );
}

function signColor(n: number | null): string {
  if (n === null) return "text-muted";
  if (n > 0) return "text-gain";
  if (n < 0) return "text-loss";
  return "text-muted";
}

function encouragement(pct: number): string {
  if (pct > 0) return `Up ${pct.toFixed(2)}% since you started.`;
  if (pct < 0) return `Down ${Math.abs(pct).toFixed(2)}% — markets fluctuate.`;
  return "Flat for now.";
}
