"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

import type { RekapRow, RekapSummary } from "@/hooks/use-rekap-sdm";

// ============================================================================
// Types
// ============================================================================
export interface RekapTableProps {
  rows: RekapRow[];
  summary: RekapSummary;
  isLoading?: boolean;
  onSort?: (column: string, order: "asc" | "desc") => void;
  currentSort?: { column: string; order: string };
}

type SortableColumn = "namaJabatan" | "pegawaiTetap" | "pkwt" | "tad" | "total";

interface ColumnDef {
  key: SortableColumn;
  label: string;
  align: "left" | "right";
}

const COLUMNS: ColumnDef[] = [
  { key: "namaJabatan", label: "Nama Jabatan", align: "left" },
  { key: "pegawaiTetap", label: "Pegawai Tetap", align: "right" },
  { key: "pkwt", label: "PKWT", align: "right" },
  { key: "tad", label: "TAD", align: "right" },
  { key: "total", label: "Total", align: "right" },
];

// ============================================================================
// Component
// ============================================================================
export function RekapTable({
  rows,
  summary,
  isLoading = false,
  onSort,
  currentSort,
}: RekapTableProps) {
  if (isLoading) {
    return <RekapTableSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Belum ada data rekap
        </p>
      </div>
    );
  }

  function handleSort(column: SortableColumn) {
    if (!onSort) return;
    const newOrder =
      currentSort?.column === column && currentSort.order === "desc"
        ? "asc"
        : "desc";
    onSort(column, newOrder);
  }

  function renderSortIcon(column: SortableColumn) {
    if (!onSort) return null;
    if (currentSort?.column !== column) {
      return <ChevronsUpDown className="ml-1 inline size-3.5 text-muted-foreground/50" />;
    }
    return currentSort.order === "asc" ? (
      <ChevronUp className="ml-1 inline size-3.5 text-primary" />
    ) : (
      <ChevronDown className="ml-1 inline size-3.5 text-primary" />
    );
  }

  function renderCellValue(column: SortableColumn, value: number) {
    if (value === 0) {
      return <span className="text-muted-foreground">0</span>;
    }
    const colorMap: Record<string, string> = {
      pegawaiTetap: "text-blue-600",
      pkwt: "text-violet-600",
      tad: "text-orange-600",
      total: "font-semibold text-foreground",
    };
    return <span className={colorMap[column] ?? ""}>{value.toLocaleString("id-ID")}</span>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="relative max-h-[600px] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-border bg-muted/50">
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                No
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    col.align === "right" ? "text-right" : "text-left",
                    onSort && "cursor-pointer select-none hover:text-foreground",
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {renderSortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.namaJabatan}
                className={cn(
                  "border-b border-border transition-colors hover:bg-muted/30",
                  idx % 2 === 1 && "bg-muted/20",
                )}
              >
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="px-4 py-2.5 font-medium text-foreground">
                  {row.namaJabatan}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                  {renderCellValue("pegawaiTetap", row.pegawaiTetap)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                  {renderCellValue("pkwt", row.pkwt)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                  {renderCellValue("tad", row.tad)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                  {renderCellValue("total", row.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="sticky bottom-0 z-10 border-t-2 border-primary bg-green-50 font-semibold shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-foreground">GRAND TOTAL</td>
              <td className="px-4 py-3 text-right tabular-nums text-blue-600">
                {summary.pegawaiTetap.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-violet-600">
                {summary.pkwt.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-orange-600">
                {summary.tad.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-foreground">
                {summary.grandTotal.toLocaleString("id-ID")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================
function RekapTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex gap-8">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="border-b border-border px-4 py-3">
          <div className="flex gap-8">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-4 w-10" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}
