"use client";

import { Fragment, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useImportLogs, type ImportLogItem } from "@/hooks/use-import";
import { formatDateTimeWITA } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 20;

function formatDuration(
  startedAt: string,
  completedAt: string | null,
): string {
  if (!completedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "-";
  const diffMs = end - start;
  const totalSeconds = Math.round(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} detik`;
  return `${minutes} menit ${seconds} detik`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        <CheckCircle2 className="size-3" />
        Selesai
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <XCircle className="size-3" />
        Gagal
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <Loader2 className="size-3 animate-spin" />
        Berjalan
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
      <AlertCircle className="size-3" />
      {status}
    </span>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={`sk-${i}`}>
          <TableCell colSpan={10} className="py-3">
            <Skeleton className="h-5 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

interface ImportLogRowProps {
  log: ImportLogItem;
  isExpanded: boolean;
  onToggle: () => void;
}

function ImportLogRow({ log, isExpanded, onToggle }: ImportLogRowProps) {
  const errorDetails = Array.isArray(log.error_details)
    ? log.error_details
    : [];
  const hasErrors = errorDetails.length > 0;

  return (
    <Fragment>
      <TableRow
        className={cn(
          hasErrors ? "cursor-pointer" : "",
          "hover:bg-muted/40",
        )}
        onClick={hasErrors ? onToggle : undefined}
      >
        <TableCell className="w-[40px] text-muted-foreground">
          {hasErrors ? (
            isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )
          ) : null}
        </TableCell>
        <TableCell className="w-[170px] text-sm text-foreground">
          {formatDateTimeWITA(log.created_at)}
        </TableCell>
        <TableCell className="min-w-[200px] text-sm font-medium text-foreground">
          {log.file_name}
        </TableCell>
        <TableCell className="w-[150px] text-sm text-muted-foreground">
          {log.user_name ?? "-"}
        </TableCell>
        <TableCell className="w-[90px] text-right text-sm tabular-nums">
          {log.total_rows.toLocaleString("id-ID")}
        </TableCell>
        <TableCell className="w-[90px] text-right text-sm font-semibold tabular-nums text-green-700">
          {log.success_count.toLocaleString("id-ID")}
        </TableCell>
        <TableCell
          className={cn(
            "w-[90px] text-right text-sm font-semibold tabular-nums",
            log.error_count > 0 ? "text-red-700" : "text-muted-foreground",
          )}
        >
          {log.error_count.toLocaleString("id-ID")}
        </TableCell>
        <TableCell className="w-[90px] text-right text-sm tabular-nums text-muted-foreground">
          {log.skipped_count.toLocaleString("id-ID")}
        </TableCell>
        <TableCell className="w-[120px]">
          <StatusBadge status={log.status} />
        </TableCell>
        <TableCell className="w-[140px] text-sm text-muted-foreground">
          {formatDuration(log.started_at, log.completed_at)}
        </TableCell>
      </TableRow>
      {isExpanded && hasErrors && (
        <TableRow className="bg-red-50/30 hover:bg-red-50/30">
          <TableCell colSpan={10} className="px-6 py-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Detail Error ({errorDetails.length})
              </p>
              <div className="max-h-[360px] overflow-auto rounded-lg border border-red-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-red-50/60 hover:bg-red-50/60">
                      <TableHead className="w-[70px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Row
                      </TableHead>
                      <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        NIP
                      </TableHead>
                      <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Nama
                      </TableHead>
                      <TableHead className="min-w-[300px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Error
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorDetails.map((e, idx) => (
                      <TableRow
                        key={`err-${log.id}-${idx}`}
                        className="hover:bg-red-50/40"
                      >
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {e.rowNumber}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {e.nip ?? (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.nama_lengkap ?? (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-red-700">
                          {e.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

export default function ImportLogsPage() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useImportLogs({
      page,
      limit: PAGE_LIMIT,
    });

  const logs = data?.logs ?? [];
  const pagination = data?.pagination;

  const hasProcessing = useMemo(
    () => logs.some((log) => log.status === "processing"),
    [logs],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <History className="size-7 text-primary" />
            Riwayat Import
          </h1>
          <p className="text-sm text-muted-foreground">
            Daftar seluruh aktivitas import data karyawan beserta ringkasan
            hasilnya.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasProcessing && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600">
              <Loader2 className="size-3 animate-spin" />
              Memperbarui otomatis...
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("size-4", isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[40px]" />
                <TableHead className="w-[170px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tanggal
                </TableHead>
                <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  File
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Diimport Oleh
                </TableHead>
                <TableHead className="w-[90px] text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total
                </TableHead>
                <TableHead className="w-[90px] text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Berhasil
                </TableHead>
                <TableHead className="w-[90px] text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Gagal
                </TableHead>
                <TableHead className="w-[90px] text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dilewati
                </TableHead>
                <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Durasi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <LoadingRows />
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-12 text-center text-sm text-destructive"
                  >
                    {error instanceof Error
                      ? error.message
                      : "Gagal memuat riwayat import"}
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-0">
                    <EmptyState
                      icon={FileSpreadsheet}
                      title="Belum ada riwayat import"
                      description="Riwayat import akan muncul di sini setelah Anda melakukan import data karyawan."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <ImportLogRow
                    key={log.id}
                    log={log}
                    isExpanded={expandedId === log.id}
                    onToggle={() =>
                      setExpandedId((prev) => (prev === log.id ? null : log.id))
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pagination && pagination.total > 0 && (
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
