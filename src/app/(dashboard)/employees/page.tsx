"use client";

import { AlertTriangle, CheckSquare, Clock, Download, Filter, Plus, SearchX, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { EmployeeTable } from "@/components/employees/employee-table";
import { ExportDialog } from "@/components/import-export/export-dialog";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEmployees } from "@/hooks/use-employees";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { useFilterStore } from "@/stores/filter-store";

interface MiniStatProps {
  label: string;
  value: number;
  tone: "default" | "blue" | "violet" | "green" | "red" | "orange";
  onClick?: () => void;
}

const TONE_STYLES: Record<MiniStatProps["tone"], string> = {
  default: "bg-white",
  blue: "bg-blue-50",
  violet: "bg-violet-50",
  green: "bg-green-50",
  red: "bg-red-50",
  orange: "bg-orange-50",
};

const VALUE_TONE: Record<MiniStatProps["tone"], string> = {
  default: "text-foreground",
  blue: "text-blue-700",
  violet: "text-violet-700",
  green: "text-green-700",
  red: "text-red-700",
  orange: "text-orange-700",
};

function MiniStatCard({ label, value, tone, onClick }: MiniStatProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border px-3 py-2.5 sm:px-4 sm:py-3",
        TONE_STYLES[tone],
        onClick && "cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/20 hover:shadow-md",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", VALUE_TONE[tone])}>
        {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

type ContractTab = "all" | "expiring" | "expired";

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [contractTab, setContractTab] = useState<ContractTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const {
    search,
    status_pegawai,
    status_kontrak,
    unit_organisasi,
    provider,
    status_kerja,
    sort,
    order,
    page,
    limit,
    setSearch,
    setFilter,
    clearFilters,
    setPage,
    toggleSort,
    activeFilterCount,
  } = useFilterStore();

  // Clear selection when page, tab, or filters change.
  const clearKey = `${page}-${contractTab}-${search}-${status_pegawai}-${status_kontrak}-${unit_organisasi}-${provider}-${status_kerja}`;
  const prevClearKey = useRef(clearKey);
  useEffect(() => {
    if (prevClearKey.current !== clearKey) {
      prevClearKey.current = clearKey;
      setSelectedIds(new Set());
    }
  }, [clearKey]);

  const query = useEmployees({
    page,
    limit,
    search,
    status_pegawai,
    status_kontrak,
    unit_organisasi,
    provider,
    status_kerja,
    sort,
    order,
    contract_status: contractTab === "all" ? null : contractTab,
  });

  const employees = query.data?.employees ?? [];
  const pagination = query.data?.pagination ?? {
    page,
    limit,
    total: 0,
    totalPages: 1,
  };
  const statistics = query.data?.statistics ?? {
    total: 0,
    pegawaiTetap: 0,
    pkwt: 0,
    tad: 0,
    aktif: 0,
    nonAktif: 0,
  };
  const contractCounts = query.data?.contractCounts ?? {
    all: 0,
    expiring: 0,
    expired: 0,
    expiredDetail: { nonAktif: 0, kontrakLewat: 0 },
  };

  const canEdit = user?.role === "super_admin" || user?.role === "admin";
  const activeCount = activeFilterCount();
  const selectionCount = selectedIds.size;

  const [exportOpen, setExportOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <Users className="size-7 text-primary" />
            Management Karyawan
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:text-sm">
              {statistics.total.toLocaleString("id-ID")} karyawan
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola data karyawan PT Gapura Angkasa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            className="gap-1.5"
            onClick={() => setExportOpen(true)}
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">
              {selectionCount > 0
                ? `Export ${selectionCount} Terpilih`
                : "Export"}
            </span>
          </Button>
          {canEdit && (
            <Button
              render={<Link href={ROUTES.EMPLOYEES_CREATE} />}
              size="lg"
              className="gap-1.5"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Tambah Karyawan</span>
            </Button>
          )}
        </div>
      </div>

      {/* Statistics mini cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStatCard label="Total" value={statistics.total} tone="default" />
        <MiniStatCard
          label="Pegawai Tetap"
          value={statistics.pegawaiTetap}
          tone="blue"
        />
        <MiniStatCard label="PKWT" value={statistics.pkwt} tone="violet" />
        <MiniStatCard label="TAD" value={statistics.tad} tone="orange" />
        <MiniStatCard label="Aktif" value={statistics.aktif} tone="green" />
        <MiniStatCard label="Non Aktif" value={statistics.nonAktif} tone="red" onClick={() => router.push(ROUTES.EMPLOYEES_NON_AKTIF)} />
      </div>

      {/* Contract status tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => { setContractTab("all"); setPage(1); }}
          className={cn(
            "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            contractTab === "all"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="size-4" />
          <span className="flex flex-col items-start leading-tight">
            <span>Semua</span>
            <span className="text-[10px] font-normal text-muted-foreground">(termasuk non-aktif)</span>
          </span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            contractTab === "all"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}>
            {contractCounts.all.toLocaleString("id-ID")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setContractTab("expiring"); setPage(1); }}
          className={cn(
            "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            contractTab === "expiring"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <AlertTriangle className="size-4" />
          Akan Berakhir
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            contractTab === "expiring"
              ? "bg-amber-100 text-amber-700"
              : contractCounts.expiring > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-muted text-muted-foreground",
          )}>
            {contractCounts.expiring.toLocaleString("id-ID")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => { setContractTab("expired"); setPage(1); }}
          className={cn(
            "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            contractTab === "expired"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock className="size-4" />
          Sudah Berakhir
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            contractTab === "expired"
              ? "bg-red-100 text-red-700"
              : contractCounts.expired > 0
                ? "bg-red-100 text-red-700"
                : "bg-muted text-muted-foreground",
          )}>
            {contractCounts.expired.toLocaleString("id-ID")}
          </span>
        </button>
      </div>

      {/* Breakdown info for "Sudah Berakhir" tab */}
      {contractTab === "expired" && contractCounts.expired > 0 && (
        <p className="text-xs text-muted-foreground">
          ({contractCounts.expiredDetail.nonAktif.toLocaleString("id-ID")} Non Aktif + {contractCounts.expiredDetail.kontrakLewat.toLocaleString("id-ID")} Kontrak Lewat)
        </p>
      )}

      {/* Toolbar: search + filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors md:hidden",
              filtersOpen || activeCount > 0
                ? "border-primary bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Filter className="size-4" />
            Filter
            {activeCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>
        <div className={cn("md:block", filtersOpen ? "block" : "hidden")}>
          <FilterBar
            status_pegawai={status_pegawai}
            status_kontrak={status_kontrak}
            unit_organisasi={unit_organisasi}
            provider={provider}
            status_kerja={status_kerja}
            onChange={setFilter}
            onClear={clearFilters}
            activeCount={activeCount}
          />
        </div>
      </div>

      {/* Selection bar */}
      {selectionCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-l-4 border-primary bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200 sm:gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {selectionCount} karyawan dipilih
            </span>
          </div>
          <div className="hidden flex-1 sm:block" />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setExportOpen(true)}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export {selectionCount} Terpilih</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="size-3.5" />
              <span className="hidden sm:inline">Hapus Pilihan</span>
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {query.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Gagal memuat data karyawan:{" "}
          {query.error instanceof Error ? query.error.message : "Unknown error"}
        </div>
      )}

      {/* Table */}
      <EmployeeTable
        employees={employees}
        isLoading={query.isLoading || query.isFetching}
        page={pagination.page}
        limit={pagination.limit}
        sort={sort}
        order={order}
        onSort={toggleSort}
        canEdit={canEdit}
        userRole={user?.role ?? "staff"}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Empty states */}
      {!query.isLoading && !query.isFetching && employees.length === 0 && (
        (search || activeCount > 0) ? (
          <EmptyState
            icon={SearchX}
            title="Tidak ada karyawan yang cocok"
            description="Coba ubah kata kunci pencarian atau filter Anda."
            action={{ label: "Reset Filter", onClick: () => { clearFilters(); setSearch(""); } }}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Belum ada data karyawan"
            description="Mulai dengan menambahkan karyawan pertama atau import data dari Excel."
            action={canEdit ? { label: "Tambah Karyawan", href: ROUTES.EMPLOYEES_CREATE } : undefined}
          />
        )
      )}

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />

      {/* Export dialog */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        selectedIds={selectedIds}
        currentFilters={{
          search,
          status_pegawai,
          status_kontrak,
          unit_organisasi,
          provider,
          status_kerja,
        }}
        userProvider={user?.provider ?? null}
        onExportSuccess={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
