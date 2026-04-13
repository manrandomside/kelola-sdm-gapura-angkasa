"use client";

import { Download, Search, TableProperties, Users, UserCheck, UserCog } from "lucide-react";
import { useState } from "react";

import { RekapTable } from "@/components/rekap-sdm/rekap-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useRekapSdm, useExportRekapSdm } from "@/hooks/use-rekap-sdm";

// ============================================================================
// Mini Stat Card
// ============================================================================
interface MiniStatProps {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ElementType;
}

function MiniStat({ label, value, colorClass, icon: Icon, subtitle }: MiniStatProps & { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground tabular-nums">
          {value.toLocaleString("id-ID")}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function MiniStatSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-12" />
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================
export default function RekapSdmPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ column: string; order: "asc" | "desc" }>({
    column: "namaJabatan",
    order: "asc",
  });

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useRekapSdm({
    search: debouncedSearch || undefined,
    sort: sort.column,
    order: sort.order,
  });

  const exportMutation = useExportRekapSdm();

  function handleSort(column: string, order: "asc" | "desc") {
    setSort({ column, order });
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Rekap SDM
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rekapitulasi jumlah SDM per jabatan berdasarkan status pegawai
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <MiniStatSkeleton key={i} />)
        ) : (
          <>
            <MiniStat
              label="Total Jabatan"
              value={summary.totalJabatan}
              colorClass="bg-emerald-500"
              icon={TableProperties}
              subtitle={`dari ${summary.grandTotal.toLocaleString("id-ID")} karyawan`}
            />
            <MiniStat
              label="Pegawai Tetap"
              value={summary.pegawaiTetap}
              colorClass="bg-blue-500"
              icon={UserCheck}
            />
            <MiniStat
              label="PKWT"
              value={summary.pkwt}
              colorClass="bg-violet-500"
              icon={UserCog}
            />
            <MiniStat
              label="TAD"
              value={summary.tad}
              colorClass="bg-orange-500"
              icon={Users}
            />
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          <Download className="size-4" />
          {exportMutation.isPending ? "Mengexport..." : "Export Excel (.xlsx)"}
        </Button>
      </div>

      {/* Table */}
      <RekapTable
        rows={data?.rows ?? []}
        summary={
          summary ?? {
            totalJabatan: 0,
            pegawaiTetap: 0,
            pkwt: 0,
            tad: 0,
            grandTotal: 0,
          }
        }
        isLoading={isLoading}
        onSort={handleSort}
        currentSort={sort}
      />
    </div>
  );
}
