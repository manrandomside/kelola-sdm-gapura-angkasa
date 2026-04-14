"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ExternalLink, RotateCcw } from "lucide-react";

import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { ROUTES } from "@/lib/constants/routes";
import { formatDateTimeWITA } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

const ACTIVITY_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  create_employee: "Tambah Karyawan",
  update_employee: "Ubah Karyawan",
  delete_employee: "Hapus Karyawan",
  import_excel: "Import Excel",
  export_excel: "Export Excel",
  create_user: "Tambah Pengguna",
  update_user: "Ubah Pengguna",
  delete_user: "Hapus Pengguna",
  update_role: "Ubah Role",
};

// Warna badge sesuai jenis aktivitas (login=blue, create=green, update=amber,
// delete=red, import=violet, export=cyan).
function getActivityBadgeClass(activity: string): string {
  if (activity === "login" || activity === "logout") {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  if (activity.startsWith("create_")) {
    return "bg-green-50 text-green-700 border border-green-200";
  }
  if (activity.startsWith("update_")) {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }
  if (activity.startsWith("delete_")) {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  if (activity === "import_excel") {
    return "bg-violet-50 text-violet-700 border border-violet-200";
  }
  if (activity === "export_excel") {
    return "bg-cyan-50 text-cyan-700 border border-cyan-200";
  }
  return "bg-gray-50 text-gray-700 border border-gray-200";
}

const ACTIVITY_GROUP_OPTIONS = [
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "import", label: "Import" },
  { value: "export", label: "Export" },
  { value: "login", label: "Login" },
  { value: "auto_update", label: "Auto Update" },
] as const;

const ALL_VALUE = "__ALL__";
const PAGE_LIMIT = 20;

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={`sk-${i}`}>
          <TableCell className="w-[170px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell className="w-[180px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell className="w-[160px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell className="w-[200px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Activity className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">
          Belum ada aktivitas tercatat
        </p>
        <p className="text-sm text-muted-foreground">
          Aktivitas pengguna akan muncul di sini seiring penggunaan sistem.
        </p>
      </div>
    </div>
  );
}

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activity] = useState<string | null>(null);
  const [activityGroup, setActivityGroup] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const query = useActivityLogs({
    page,
    limit: PAGE_LIMIT,
    activity,
    activityGroup,
    search,
    sort: "created_at",
    order: "desc",
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  });

  const activities = query.data?.activities ?? [];
  const pagination = query.data?.pagination ?? {
    page,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  };

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleGroupChange(value: string | null) {
    setActivityGroup(value);
    setPage(1);
  }

  function handleResetFilters() {
    setSearch("");
    setActivityGroup(null);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const hasActiveFilters =
    search.length > 0 ||
    activityGroup !== null ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  const isLoading = query.isLoading || query.isFetching;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
          <Activity className="size-7 text-primary" />
          Activity Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Riwayat aktivitas pengguna di sistem Kelola SDM Gapura Angkasa.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Cari deskripsi atau target..."
        />
        <Select
          value={activityGroup ?? ALL_VALUE}
          onValueChange={(next) => {
            const asString = next as string;
            handleGroupChange(asString === ALL_VALUE ? null : asString);
          }}
        >
          <SelectTrigger className="h-10 min-w-[180px]">
            <SelectValue>
              {(current: string) =>
                current === ALL_VALUE ? (
                  <span className="text-muted-foreground">Tipe Aktivitas</span>
                ) : (
                  <span>
                    {ACTIVITY_GROUP_OPTIONS.find((o) => o.value === current)
                      ?.label ?? current}
                  </span>
                )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              <span className="text-muted-foreground">Semua Tipe</span>
            </SelectItem>
            {ACTIVITY_GROUP_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="h-10 w-[160px]"
            placeholder="Dari tanggal"
          />
          <span className="text-sm text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="h-10 w-[160px]"
            placeholder="Sampai tanggal"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-10"
          >
            <RotateCcw className="size-4" />
            Reset Filter
          </Button>
        )}
      </div>

      {/* Error state */}
      {query.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Gagal memuat activity log:{" "}
          {query.error instanceof Error ? query.error.message : "Unknown error"}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[170px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Waktu
              </TableHead>
              <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pengguna
              </TableHead>
              <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aktivitas
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Deskripsi
              </TableHead>
              <TableHead className="w-[220px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Target
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && activities.length === 0 ? (
              <LoadingRows />
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              activities.map((log) => {
                const targetHref =
                  log.target_type === "employee" && log.target_id
                    ? ROUTES.EMPLOYEES_DETAIL(log.target_id)
                    : null;
                return (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell className="w-[170px] whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTimeWITA(log.created_at)}
                    </TableCell>
                    <TableCell className="w-[180px]">
                      <div className="text-sm font-medium text-foreground">
                        {log.user_name ?? "-"}
                      </div>
                      {log.user_email && (
                        <div className="text-xs text-muted-foreground">
                          {log.user_email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-[160px]">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                          getActivityBadgeClass(log.activity),
                        )}
                      >
                        {ACTIVITY_LABELS[log.activity] ?? log.activity}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {log.description}
                    </TableCell>
                    <TableCell className="w-[220px] text-sm">
                      {log.target_label ? (
                        targetHref ? (
                          <Link
                            href={targetHref}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {log.target_label}
                            <ExternalLink className="size-3" />
                          </Link>
                        ) : (
                          <span className="text-foreground">
                            {log.target_label}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
