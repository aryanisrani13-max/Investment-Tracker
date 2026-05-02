import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { EnrichedHolding } from "../lib/portfolio";

const PALETTE = [
  "#ffffff",
  "#a3a3a3",
  "#737373",
  "#525252",
  "#404040",
  "#2a2a2a",
];

type Slice = { name: string; value: number; pct: number };

export function AllocationDonut({
  enriched,
  totalValue,
}: {
  enriched: EnrichedHolding[];
  totalValue: number;
}) {
  if (enriched.length === 0 || totalValue <= 0) return null;

  const sorted = [...enriched].sort((a, b) => b.marketValue - a.marketValue);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const slices: Slice[] = top.map((h) => ({
    name: h.symbol,
    value: h.marketValue,
    pct: (h.marketValue / totalValue) * 100,
  }));
  if (rest.length > 0) {
    const restTotal = rest.reduce((s, h) => s + h.marketValue, 0);
    slices.push({ name: "Other", value: restTotal, pct: (restTotal / totalValue) * 100 });
  }

  return (
    <div className="px-6 py-2">
      <div className="text-muted text-xs uppercase tracking-wide mb-3">Allocation</div>
      <div className="flex items-center gap-6">
        <div className="w-[120px] h-[120px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {slices.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="text-ink truncate">{s.name}</span>
              <span className="text-muted tnum ml-auto">
                {s.pct.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
