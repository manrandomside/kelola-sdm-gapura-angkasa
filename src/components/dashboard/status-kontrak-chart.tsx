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

interface StatusKontrakChartProps {
  data: ChartDataPoint[];
}

const COLOR_MAP: Record<string, string> = {
  "PEGAWAI TETAP": "#3B82F6",
  PKWT: "#8B5CF6",
  "PAKET SDM": "#F59E0B",
  "PAKET PEKERJAAN": "#EC4899",
};

const FALLBACK_COLOR = "#94A3B8";

function resolveColor(name: string): string {
  return COLOR_MAP[name] ?? FALLBACK_COLOR;
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

interface CustomLabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
}

function CustomLabel({ x = 0, y = 0, width = 0, value = 0 }: CustomLabelProps) {
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-foreground text-xs font-semibold"
    >
      {value.toLocaleString("id-ID")}
    </text>
  );
}

export function StatusKontrakChart({ data }: StatusKontrakChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="glass-card-subtle rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground">
        Distribusi Status Kontrak
      </h3>
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
              <BarChart
                data={data}
                margin={{ top: 24, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} isAnimationActive={false} />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                  label={<CustomLabel />}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={resolveColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: resolveColor(entry.name) }}
                />
                <span className="truncate text-foreground">{entry.name}</span>
                <span className="ml-auto font-semibold tabular-nums text-muted-foreground">
                  {entry.value.toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
