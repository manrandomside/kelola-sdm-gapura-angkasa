"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { StatusPerOrgPoint } from "@/hooks/use-dashboard";

interface StatusOrgChartProps {
  data: StatusPerOrgPoint[];
}

interface TooltipPayload {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((acc, p) => acc + p.value, 0);
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span>{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums">
            {p.value.toLocaleString("id-ID")}
          </span>
        </div>
      ))}
      <div className="mt-1 border-t border-border pt-1 text-xs font-semibold text-foreground">
        Total: {total.toLocaleString("id-ID")}
      </div>
    </div>
  );
}

export function StatusOrgChart({ data }: StatusOrgChartProps) {
  const grandTotal = data.reduce(
    (acc, d) => acc + d.pegawaiTetap + d.pkwt + d.tad,
    0,
  );

  return (
    <div className="glass-card-subtle rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground">
        SDM per Unit Organisasi (Breakdown Status)
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Total {grandTotal.toLocaleString("id-ID")} karyawan aktif di{" "}
        {data.length} unit organisasi
      </p>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Belum ada data
        </div>
      ) : (
        <div className="mt-4 h-80 w-full">
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
                dataKey="kode"
                tick={{ fontSize: 11, fill: "#374151" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickFormatter={(v: number) => v.toLocaleString("id-ID")}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F3F4F6" }} />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconType="circle"
                iconSize={10}
              />
              <Bar
                dataKey="pegawaiTetap"
                name="Pegawai Tetap"
                stackId="status"
                fill="#3B82F6"
                radius={[0, 0, 0, 0]}
                maxBarSize={48}
              />
              <Bar
                dataKey="pkwt"
                name="PKWT"
                stackId="status"
                fill="#8B5CF6"
                radius={[0, 0, 0, 0]}
                maxBarSize={48}
              />
              <Bar
                dataKey="tad"
                name="TAD"
                stackId="status"
                fill="#F97316"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
