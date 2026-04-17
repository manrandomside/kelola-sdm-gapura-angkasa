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

import type { PositionGroupPoint } from "@/hooks/use-dashboard";
import { useIsMobile } from "@/hooks/use-mobile";

interface PositionGroupChartProps {
  data: PositionGroupPoint[];
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: PositionGroupPoint;
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
        {item.payload.label}
      </p>
      <p className="text-xs text-muted-foreground">
        {item.value.toLocaleString("id-ID")} karyawan
      </p>
    </div>
  );
}

const POSITION_COLORS: Record<string, string> = {
  STAFF: "#3B82F6",
  SUPERVISOR: "#22C55E",
  MANAGER: "#F59E0B",
  "ACCOUNT EXECUTIVE / AE": "#8B5CF6",
  NON: "#9CA3AF",
  "GENERAL MANAGER": "#EC4899",
  "EXECUTIVE GENERAL MANAGER": "#06B6D4",
};

const DEFAULT_COLOR = "#6366F1";

const SHORT_LABELS: Record<string, string> = {
  "ACCOUNT EXECUTIVE / AE": "AE",
  "GENERAL MANAGER": "GM",
  "EXECUTIVE GENERAL MANAGER": "EGM",
};

function truncateLabel(value: string, maxLen: number): string {
  const short = SHORT_LABELS[value];
  if (short) return short;
  if (value.length <= maxLen) return value;
  return value.substring(0, maxLen - 1) + "...";
}

export function PositionGroupChart({ data }: PositionGroupChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  const isMobile = useIsMobile();
  const barHeight = isMobile ? 36 : 44;

  return (
    <div className="glass-card-subtle rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground">
        Kelompok Jabatan
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Total {total.toLocaleString("id-ID")} karyawan aktif
      </p>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Belum ada data
        </div>
      ) : (
        <div className="mt-4 w-full" style={{ height: Math.max(isMobile ? 200 : 240, data.length * barHeight) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: isMobile ? 8 : 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="#E5E7EB"
              />
              <XAxis
                type="number"
                tick={{ fontSize: isMobile ? 9 : 11, fill: "#6B7280" }}
                tickFormatter={(v: number) => v.toLocaleString("id-ID")}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: isMobile ? 8 : 11, fill: "#374151" }}
                width={isMobile ? 80 : 170}
                interval={0}
                tickFormatter={(v: string) => isMobile ? truncateLabel(v, 10) : v}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#F3F4F6" }}
                isAnimationActive={false}
              />
              <Bar
                dataKey="count"
                radius={[0, 6, 6, 0]}
                maxBarSize={24}
                label={{ position: "right", fontSize: isMobile ? 9 : 11, fill: "#6B7280" }}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={POSITION_COLORS[entry.label] ?? DEFAULT_COLOR}
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
