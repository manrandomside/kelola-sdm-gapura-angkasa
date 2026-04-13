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

import type { ChartDataPoint } from "@/hooks/use-dashboard";

interface BarChartCardProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  color?: string;
  /** Per-bar colors. When provided, each bar gets its own color (by index). */
  colors?: string[];
  layout?: "horizontal" | "vertical";
  height?: number;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: ChartDataPoint;
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
        {item.payload.name}
      </p>
      <p className="text-xs text-muted-foreground">
        {item.value.toLocaleString("id-ID")} karyawan
      </p>
    </div>
  );
}

export function BarChartCard({
  title,
  description,
  data,
  color = "#439454",
  colors,
  layout = "vertical",
  height = 320,
}: BarChartCardProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="glass-card-subtle rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {description ?? `Total ${total.toLocaleString("id-ID")} karyawan aktif`}
      </p>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Belum ada data
        </div>
      ) : (
        <div className="mt-4 w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {layout === "vertical" ? (
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  stroke="#E5E7EB"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(v: number) => v.toLocaleString("id-ID")}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#374151" }}
                  width={140}
                  interval={0}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "#F3F4F6" }}
                />
                <Bar
                  dataKey="value"
                  fill={colors ? undefined : color}
                  radius={[0, 6, 6, 0]}
                  maxBarSize={24}
                >
                  {colors && data.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={data}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="#E5E7EB"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#374151" }}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(v: number) => v.toLocaleString("id-ID")}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "#F3F4F6" }}
                />
                <Bar
                  dataKey="value"
                  fill={colors ? undefined : color}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                >
                  {colors && data.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
