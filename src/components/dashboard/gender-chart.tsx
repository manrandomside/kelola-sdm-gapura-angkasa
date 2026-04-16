"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { GenderDataPoint } from "@/hooks/use-dashboard";

interface GenderChartProps {
  data: GenderDataPoint[];
}

const COLOR_MAP: Record<string, string> = {
  L: "#3B82F6",
  P: "#EC4899",
};

const FALLBACK_COLOR = "#94A3B8";

interface TooltipPayload {
  name: string;
  value: number;
  payload: GenderDataPoint;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-foreground">{item.payload.label}</p>
      <p className="text-xs text-muted-foreground">
        {item.payload.count.toLocaleString("id-ID")} karyawan (
        {item.payload.percentage.toFixed(1)}%)
      </p>
    </div>
  );
}

export function GenderChart({ data }: GenderChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="glass-card-subtle rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground">Jenis Kelamin</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Total {total.toLocaleString("id-ID")} karyawan aktif
      </p>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Belum ada data
        </div>
      ) : (
        <>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.value}
                      fill={COLOR_MAP[entry.value] ?? FALLBACK_COLOR}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {data.map((entry) => (
              <div
                key={entry.value}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: COLOR_MAP[entry.value] ?? FALLBACK_COLOR }}
                />
                <span className="truncate text-foreground">{entry.label}</span>
                <span className="ml-auto font-semibold tabular-nums text-muted-foreground">
                  {entry.count.toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
