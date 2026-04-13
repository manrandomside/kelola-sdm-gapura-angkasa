"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AgeRangePoint } from "@/hooks/use-dashboard";

interface AgeChartProps {
  data: AgeRangePoint[];
}

const RANGE_COLORS: Record<string, string> = {
  "18-25": "#06B6D4",
  "26-35": "#22C55E",
  "36-45": "#F59E0B",
  "46-55": "#F97316",
  "56+": "#EF4444",
  "N/A": "#94A3B8",
};

interface TooltipPayload {
  name: string;
  value: number;
  payload: AgeRangePoint;
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
      <p className="text-xs font-semibold text-foreground">
        Usia {item.payload.range} tahun
      </p>
      <p className="text-xs text-muted-foreground">
        {item.value.toLocaleString("id-ID")} karyawan
      </p>
    </div>
  );
}

export function AgeChart({ data }: AgeChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="glass-card-subtle rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground">
        Komposisi Usia SDM
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Total {total.toLocaleString("id-ID")} karyawan aktif
      </p>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Belum ada data
        </div>
      ) : (
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="#E5E7EB"
              />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: "#374151" }}
                tickFormatter={(v: string) => (v === "N/A" ? "N/A" : `${v} th`)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickFormatter={(v: number) => v.toLocaleString("id-ID")}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#F3F4F6" }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} label={{ position: "top", fontSize: 11, fill: "#6B7280" }}>
                {data.map((entry) => (
                  <Cell
                    key={entry.range}
                    fill={RANGE_COLORS[entry.range] ?? "#94A3B8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
