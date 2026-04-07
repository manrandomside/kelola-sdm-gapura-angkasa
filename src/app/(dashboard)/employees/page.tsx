"use client";

import { Plus, Users } from "lucide-react";
import Link from "next/link";

import { EmployeeTable } from "@/components/employees/employee-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEmployees } from "@/hooks/use-employees";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/stores/filter-store";

interface MiniStatProps {
  label: string;
  value: number;
  tone: "default" | "blue" | "violet" | "green" | "red";
}

const TONE_STYLES: Record<MiniStatProps["tone"], string> = {
  default: "bg-white",
  blue: "bg-blue-50",
  violet: "bg-violet-50",
  green: "bg-green-50",
  red: "bg-red-50",
};

const VALUE_TONE: Record<MiniStatProps["tone"], string> = {
  default: "text-foreground",
  blue: "text-blue-700",
  violet: "text-violet-700",
  green: "text-green-700",
  red: "text-red-700",
};

function MiniStatCard({ label, value, tone }: MiniStatProps) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[140px] rounded-xl border border-border px-4 py-3",
        TONE_STYLES[tone],
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", VALUE_TONE[tone])}>
        {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();

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
    tad: 0,
    aktif: 0,
    nonAktif: 0,
  };

  const canEdit = user?.role === "super_admin" || user?.role === "admin";
  const activeCount = activeFilterCount();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <Users className="size-7 text-primary" />
            Daftar Karyawan
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola data karyawan PT Gapura Angkasa.
          </p>
        </div>
        {canEdit && (
          <Button
            render={<Link href={ROUTES.EMPLOYEES_CREATE} />}
            size="lg"
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Tambah Karyawan
          </Button>
        )}
      </div>

      {/* Statistics mini cards */}
      <div className="flex flex-wrap gap-3">
        <MiniStatCard label="Total" value={statistics.total} tone="default" />
        <MiniStatCard
          label="Pegawai Tetap"
          value={statistics.pegawaiTetap}
          tone="blue"
        />
        <MiniStatCard label="TAD" value={statistics.tad} tone="violet" />
        <MiniStatCard label="Aktif" value={statistics.aktif} tone="green" />
        <MiniStatCard label="Non Aktif" value={statistics.nonAktif} tone="red" />
      </div>

      {/* Toolbar: search + filters */}
      <div className="space-y-3">
        <SearchInput value={search} onChange={setSearch} />
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
      />

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
