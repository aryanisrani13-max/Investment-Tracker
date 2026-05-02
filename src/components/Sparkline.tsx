import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { Candle } from "../lib/types";

export function Sparkline({ data, up, height = 56 }: { data: Candle[]; up: boolean; height?: number }) {
  const color = up ? "#00c805" : "#ff5000";
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="c"
            stroke={color}
            strokeWidth={1.75}
            fill="url(#spark)"
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
