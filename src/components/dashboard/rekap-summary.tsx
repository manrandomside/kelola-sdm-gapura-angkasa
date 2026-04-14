"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useRekapSdm } from "@/hooks/use-rekap-sdm";
import { ROUTES } from "@/lib/constants/routes";

// ============================================================================
// Component
// ============================================================================
export function RekapSummaryCard() {
  const { data, isLoading } = useRekapSdm({});

  if (isLoading) {
    return <RekapSummarySkeleton />;
  }

  if (!data || data.rows.length === 0) {
    return null;
  }

  // Show top 10 by total (sorted descending)
  const rows = [...data.rows].sort((a, b) => b.total - a.total).slice(0, 10);
  const { summary } = data;

  return (
    <div className="glass-card-subtle rounded-2xl">
      {/* Header */}
      <div className="border-b border-white/30 px-5 py-4">
        <h3 className="text-base font-semibold text-foreground">
          Rekap SDM per Jabatan
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Menampilkan 10 jabatan terbanyak
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nama Jabatan
              </th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tetap
              </th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                PKWT
              </th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                TAD
              </th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.namaJabatan}
                className={cn(
                  "border-b border-border",
                  idx % 2 === 1 && "bg-muted/20",
                )}
              >
                <td className="px-4 py-2 font-medium text-foreground">
                  {row.namaJabatan}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                  {row.pegawaiTetap > 0 ? (
                    <span className="text-blue-600">{row.pegawaiTetap}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                  {row.pkwt > 0 ? (
                    <span className="text-violet-600">{row.pkwt}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                  {row.tad > 0 ? (
                    <span className="text-orange-600">{row.tad}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums font-semibold">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-50 font-semibold">
              <td className="px-4 py-2.5 text-foreground">GRAND TOTAL</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-blue-600">
                {summary.pegawaiTetap}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-violet-600">
                {summary.pkwt}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-orange-600">
                {summary.tad}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums font-bold">
                {summary.grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer link */}
      <div className="border-t border-border px-5 py-3">
        <Link
          href={ROUTES.REKAP_SDM}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Lihat Rekap Lengkap
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================
function RekapSummarySkeleton() {
  return (
    <div className="glass-card-subtle rounded-2xl">
      <div className="border-b border-white/30 px-5 py-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-1 h-3 w-36" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-44 flex-1" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
