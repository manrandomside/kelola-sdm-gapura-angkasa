"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/shared/empty-state";
import { useAnalytics } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";

// ============================================================================
// Comparison Card
// ============================================================================

interface ComparisonCardProps {
  label: string;
  value: number;
  diff: number;
}

function ComparisonCard({ label, value, diff }: ComparisonCardProps) {
  const isPositive = diff > 0;
  const isNegative = diff < 0;

  return (
    <div className="glass-card flex flex-col gap-1 rounded-2xl p-4 sm:p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-foreground">
        {value.toLocaleString("id-ID")}
      </p>
      <div className="flex items-center gap-1 text-xs">
        {isPositive && (
          <>
            <ArrowUp className="size-3.5 text-green-600" />
            <span className="font-semibold text-green-600">+{diff}</span>
          </>
        )}
        {isNegative && (
          <>
            <ArrowDown className="size-3.5 text-red-600" />
            <span className="font-semibold text-red-600">{diff}</span>
          </>
        )}
        {diff === 0 && (
          <>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">0</span>
          </>
        )}
        <span className="text-muted-foreground">dari bulan lalu</span>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function CardSkeleton() {
  return (
    <div className="glass-card animate-pulse rounded-2xl p-5">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="mt-2 h-8 w-16 rounded bg-muted" />
      <div className="mt-2 h-3 w-28 rounded bg-muted" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="glass-card-subtle animate-pulse rounded-2xl p-5">
      <div className="h-5 w-48 rounded bg-muted" />
      <div className="mt-4 h-[350px] w-full rounded-lg bg-muted/50" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="glass-card-subtle animate-pulse rounded-2xl p-5">
      <div className="h-5 w-48 rounded bg-muted" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-muted/50" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Custom Tooltip
// ============================================================================

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// Turnover Rate Badge
// ============================================================================

function TurnoverBadge({ rate }: { rate: number }) {
  let colorClass: string;
  if (rate < 2) {
    colorClass = "bg-green-50 text-green-600";
  } else if (rate <= 5) {
    colorClass = "bg-amber-50 text-amber-600";
  } else {
    colorClass = "bg-red-50 text-red-600";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        colorClass,
      )}
    >
      {rate.toFixed(1)}%
    </span>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();

  const tren = data?.trenBulanan ?? [];
  const perbandingan = data?.perbandingan;
  const turnover = data?.turnover ?? [];

  const hasTrenData = tren.some((m) => m.masuk > 0 || m.keluar > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
          <TrendingUp className="size-7 text-primary" />
          Analitik SDM
        </h1>
        <p className="text-sm text-muted-foreground">
          Perbandingan data dan tren SDM per periode.
        </p>
      </div>

      {/* Comparison cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Perbandingan Bulan Ini vs Bulan Lalu
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : perbandingan ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ComparisonCard
              label="Total SDM"
              value={perbandingan.bulanIni.total}
              diff={perbandingan.selisih.total}
            />
            <ComparisonCard
              label="Aktif"
              value={perbandingan.bulanIni.aktif}
              diff={perbandingan.selisih.aktif}
            />
            <ComparisonCard
              label="Non Aktif"
              value={perbandingan.bulanIni.nonAktif}
              diff={perbandingan.selisih.nonAktif}
            />
            <ComparisonCard
              label="Kontrak Berakhir"
              value={perbandingan.bulanIni.kontrakBerakhir}
              diff={perbandingan.selisih.kontrakBerakhir}
            />
            <ComparisonCard
              label="Karyawan Masuk"
              value={perbandingan.bulanIni.karyawanMasuk}
              diff={perbandingan.selisih.karyawanMasuk}
            />
          </div>
        ) : null}
      </div>

      {/* Line chart — trend */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Tren SDM 12 Bulan Terakhir
        </h2>
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="glass-card-subtle rounded-2xl p-5">
            {hasTrenData ? (
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart
                  data={tren}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="fillMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillKeluar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="masuk"
                    fill="url(#fillMasuk)"
                    stroke="none"
                    name="Masuk"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="keluar"
                    fill="url(#fillKeluar)"
                    stroke="none"
                    name="Keluar (area)"
                    legendType="none"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="masuk"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#22C55E" }}
                    activeDot={{ r: 5 }}
                    name="Masuk"
                    legendType="none"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="keluar"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#EF4444" }}
                    activeDot={{ r: 5 }}
                    name="Keluar"
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="Belum ada data tren"
                description="Data tren akan muncul setelah ada karyawan dengan TMT mulai/berakhir kerja."
              />
            )}
          </div>
        )}
      </div>

      {/* Turnover table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Turn-over Rate per Provider
        </h2>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="glass-card-subtle overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      No
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                      Total SDM
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                      Masuk (bln lalu)
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                      Keluar (bln lalu)
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                      Turn-over Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {turnover.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Belum ada data provider.
                      </td>
                    </tr>
                  ) : (
                    turnover.map((row, idx) => (
                      <tr
                        key={row.provider}
                        className={cn(
                          "border-b border-border transition-colors hover:bg-muted/20",
                          idx % 2 === 1 && "bg-muted/10",
                        )}
                      >
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {row.provider}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.total.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.masuk.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.keluar.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <TurnoverBadge rate={row.turnoverRate} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
