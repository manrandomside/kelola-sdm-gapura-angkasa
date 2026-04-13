"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { ChartDataPoint } from "@/hooks/use-dashboard";

interface DonutChartCardProps {
  title: string;
  data: ChartDataPoint[];
}

// Warna per kategori status_kontrak. Fallback untuk kategori tidak dikenal.
const COLOR_MAP: Record<string, string> = {
  "PEGAWAI TETAP": "#3B82F6",
  PKWT: "#8B5CF6",
  "PAKET SDM": "#F97316",
  "PAKET PEKERJAAN": "#EC4899",
};

const FALLBACK_COLOR = "#94A3B8";

function resolveColor(name: string): string {
  return COLOR_MAP[name] ?? FALLBACK_COLOR;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: ChartDataPoint & { percent: number };
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
      <p className="text-xs font-semibold text-foreground">{item.name}</p>
      <p className="text-xs text-muted-foreground">
        {item.value.toLocaleString("id-ID")} karyawan (
        {item.payload.percent.toFixed(1)}%)
      </p>
    </div>
  );
}

export function DonutChartCard({ title, data }: DonutChartCardProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const chartData = data.map((d) => ({
    ...d,
    percent: total > 0 ? (d.value / total) * 100 : 0,
  }));

  return (
    <div className="glass-card-subtle rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
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
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={resolveColor(entry.name)}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom legend */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {chartData.map((entry) => (
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
