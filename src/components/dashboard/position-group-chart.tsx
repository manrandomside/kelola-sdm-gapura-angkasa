"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PositionGroupPoint } from "@/hooks/use-dashboard";

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

export function PositionGroupChart({ data }: PositionGroupChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="rounded-xl border border-border bg-white p-5">
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
        <div className="mt-4 w-full" style={{ height: Math.max(240, data.length * 44) }}>
          <ResponsiveContainer width="100%" height="100%">
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
                dataKey="label"
                tick={{ fontSize: 11, fill: "#374151" }}
                width={170}
                interval={0}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#F3F4F6" }}
              />
              <Bar
                dataKey="count"
                fill="#439454"
                radius={[0, 6, 6, 0]}
                maxBarSize={24}
                label={{ position: "right", fontSize: 11, fill: "#6B7280" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
