"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Pagination } from "@/components/shared/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDownloadTemplate, useImportPreview } from "@/hooks/use-import";
import { cn } from "@/lib/utils";

import type {
  ImportPreviewResult,
  ImportPreviewRow,
  ImportRowStatus,
} from "@/lib/utils/excel";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PREVIEW_PAGE_SIZE = 50;

type FilterTab = "all" | "valid" | "warning" | "error";

interface SummaryCardProps {
  label: string;
  value: number;
  tone: "blue" | "green" | "amber" | "red" | "gray";
}

const TONE_BG: Record<SummaryCardProps["tone"], string> = {
  blue: "bg-blue-50 border-blue-200",
  green: "bg-green-50 border-green-200",
  amber: "bg-amber-50 border-amber-200",
  red: "bg-red-50 border-red-200",
  gray: "bg-gray-50 border-gray-200",
};

const TONE_TEXT: Record<SummaryCardProps["tone"], string> = {
  blue: "text-blue-700",
  green: "text-green-700",
  amber: "text-amber-700",
  red: "text-red-700",
  gray: "text-gray-700",
};

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[140px] rounded-xl border px-4 py-3",
        TONE_BG[tone],
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn("mt-1 text-2xl font-bold tabular-nums", TONE_TEXT[tone])}
      >
        {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: ImportRowStatus }) {
  if (status === "valid") {
    return <CheckCircle2 className="size-4 text-green-600" />;
  }
  if (status === "warning") {
    return <AlertCircle className="size-4 text-amber-600" />;
  }
  return <XCircle className="size-4 text-red-600" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [previewPage, setPreviewPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const downloadTemplate = useDownloadTemplate();
  const importPreview = useImportPreview();

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const rejection = rejections[0];
        const code = rejection.errors[0]?.code;
        if (code === "file-too-large") {
          toast.error("Ukuran file melebihi 10MB");
        } else if (code === "file-invalid-type") {
          toast.error("Format file harus .xlsx atau .csv");
        } else {
          toast.error("File tidak dapat diterima");
        }
        return;
      }
      const accepted0 = accepted[0];
      if (accepted0) {
        setFile(accepted0);
      }
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_FILE_SIZE,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "text/csv": [".csv"],
    },
  });

  function handleProcessFile() {
    if (!file) return;
    importPreview.mutate(file, {
      onSuccess: (data) => {
        setPreview(data);
        setFilterTab("all");
        setPreviewPage(1);
        setExpandedRows(new Set());
      },
    });
  }

  function handleBackToUpload() {
    setPreview(null);
    setFilterTab("all");
    setPreviewPage(1);
    setExpandedRows(new Set());
  }

  function toggleRowExpanded(rowNumber: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  }

  function handleConfirmImport() {
    setIsConfirmOpen(false);
    toast.info("Fitur execute import akan tersedia di update berikutnya.");
  }

  // Filter rows berdasarkan tab aktif.
  const filteredRows = useMemo<ImportPreviewRow[]>(() => {
    if (!preview) return [];
    if (filterTab === "all") return preview.rows;
    return preview.rows.filter((r) => r.status === filterTab);
  }, [preview, filterTab]);

  // Client-side pagination.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PREVIEW_PAGE_SIZE),
  );
  const safePage = Math.min(previewPage, totalPages);
  const pageStart = (safePage - 1) * PREVIEW_PAGE_SIZE;
  const visibleRows = filteredRows.slice(
    pageStart,
    pageStart + PREVIEW_PAGE_SIZE,
  );

  const importableCount = preview
    ? preview.summary.validCount + preview.summary.warningCount
    : 0;

  // ==========================================================================
  // Step 2 — Preview & Validasi
  // ==========================================================================
  if (preview) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <FileSpreadsheet className="size-7 text-primary" />
            Preview Import Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Periksa hasil validasi sebelum melanjutkan import.
          </p>
        </div>

        {/* Summary cards */}
        <div className="flex flex-wrap gap-3">
          <SummaryCard
            label="Total Baris"
            value={preview.summary.totalRows}
            tone="blue"
          />
          <SummaryCard
            label="Valid"
            value={preview.summary.validCount}
            tone="green"
          />
          <SummaryCard
            label="Warning"
            value={preview.summary.warningCount}
            tone="amber"
          />
          <SummaryCard
            label="Error"
            value={preview.summary.errorCount}
            tone="red"
          />
          <SummaryCard
            label="Baru (Insert)"
            value={preview.summary.newCount}
            tone="green"
          />
          <SummaryCard
            label="Update"
            value={preview.summary.updateCount}
            tone="blue"
          />
          <SummaryCard
            label="Dilewati"
            value={preview.summary.skippedCount}
            tone="gray"
          />
        </div>

        {/* Filter tabs */}
        <Tabs
          value={filterTab}
          onValueChange={(next) => {
            setFilterTab(next as FilterTab);
            setPreviewPage(1);
            setExpandedRows(new Set());
          }}
        >
          <TabsList className="h-auto w-full justify-start gap-1 bg-muted/60 p-1 sm:w-auto">
            <TabsTrigger value="all" className="h-9 px-4">
              Semua ({preview.summary.totalRows})
            </TabsTrigger>
            <TabsTrigger value="valid" className="h-9 px-4">
              Valid ({preview.summary.validCount})
            </TabsTrigger>
            <TabsTrigger value="warning" className="h-9 px-4">
              Warning ({preview.summary.warningCount})
            </TabsTrigger>
            <TabsTrigger value="error" className="h-9 px-4">
              Error ({preview.summary.errorCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Preview table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[60px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Row
                  </TableHead>
                  <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    NIP
                  </TableHead>
                  <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nama Lengkap
                  </TableHead>
                  <TableHead className="w-[150px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit Organisasi
                  </TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Jabatan
                  </TableHead>
                  <TableHead className="w-[150px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status Pegawai
                  </TableHead>
                  <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada data dengan filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row) => {
                    const isExpanded = expandedRows.has(row.rowNumber);
                    const hasDetail =
                      row.validation.errors.length > 0 ||
                      row.validation.warnings.length > 0;
                    const rowBg =
                      row.status === "valid"
                        ? "bg-green-50/40"
                        : row.status === "warning"
                          ? "bg-amber-50/50"
                          : "bg-red-50/50";
                    return (
                      <Fragment key={`row-${row.rowNumber}`}>
                        <TableRow
                          className={cn(rowBg, "hover:bg-opacity-80")}
                        >
                          <TableCell className="w-[60px] text-sm text-muted-foreground tabular-nums">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell className="w-[80px]">
                            <div className="flex items-center gap-1.5">
                              <StatusIcon status={row.status} />
                              {row.isExistingNip && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                                  Update
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-[130px] font-mono text-sm">
                            {row.data.nip ?? (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[200px] text-sm font-medium text-foreground">
                            {row.data.nama_lengkap ?? (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="w-[150px] text-sm">
                            {row.data.unit_organisasi ?? (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[180px] truncate text-sm">
                            {row.data.nama_jabatan ?? (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="w-[150px] text-sm">
                            {row.data.status_pegawai ?? (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="w-[80px]">
                            {hasDetail && (
                              <button
                                type="button"
                                onClick={() =>
                                  toggleRowExpanded(row.rowNumber)
                                }
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                aria-label="Lihat detail"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="size-4" />
                                ) : (
                                  <ChevronRight className="size-4" />
                                )}
                                Detail
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && hasDetail && (
                          <TableRow
                            className={cn(rowBg, "hover:bg-opacity-80")}
                          >
                            <TableCell colSpan={8} className="px-6 py-3">
                              <div className="space-y-2 text-sm">
                                {row.validation.errors.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase text-red-700">
                                      Error
                                    </p>
                                    <ul className="mt-1 space-y-0.5">
                                      {row.validation.errors.map((e, idx) => (
                                        <li
                                          key={`e-${idx}`}
                                          className="text-red-700"
                                        >
                                          <span className="font-medium">
                                            {e.field}:
                                          </span>{" "}
                                          {e.message}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {row.validation.warnings.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase text-amber-700">
                                      Warning
                                    </p>
                                    <ul className="mt-1 space-y-0.5">
                                      {row.validation.warnings.map(
                                        (w, idx) => (
                                          <li
                                            key={`w-${idx}`}
                                            className="text-amber-700"
                                          >
                                            <span className="font-medium">
                                              {w.field}:
                                            </span>{" "}
                                            {w.message}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {filteredRows.length > 0 && (
          <Pagination
            page={safePage}
            limit={PREVIEW_PAGE_SIZE}
            total={filteredRows.length}
            totalPages={totalPages}
            onPageChange={setPreviewPage}
          />
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={handleBackToUpload}>
            <ArrowLeft className="size-4" />
            Kembali
          </Button>
          <Button
            disabled={importableCount === 0}
            onClick={() => setIsConfirmOpen(true)}
          >
            <Upload className="size-4" />
            Import {importableCount.toLocaleString("id-ID")} Data
          </Button>
        </div>

        {/* Confirm dialog */}
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Import</AlertDialogTitle>
              <AlertDialogDescription>
                Anda akan mengimport{" "}
                <span className="font-semibold text-foreground">
                  {importableCount.toLocaleString("id-ID")}
                </span>{" "}
                data karyawan.{" "}
                <span className="font-semibold text-foreground">
                  {preview.summary.newCount.toLocaleString("id-ID")}
                </span>{" "}
                data baru akan ditambahkan dan{" "}
                <span className="font-semibold text-foreground">
                  {preview.summary.updateCount.toLocaleString("id-ID")}
                </span>{" "}
                data existing akan diperbarui. Setiap karyawan baru akan
                otomatis dibuatkan akun login (NIP = password).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  handleConfirmImport();
                }}
              >
                Import Sekarang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ==========================================================================
  // Step 1 — Upload File
  // ==========================================================================
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
          <FileSpreadsheet className="size-7 text-primary" />
          Import Data Karyawan
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload file Excel (.xlsx) atau CSV (.csv) untuk import data karyawan
          secara massal.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Unduh Template
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gunakan template resmi untuk memastikan format data sesuai.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => downloadTemplate.mutate()}
            disabled={downloadTemplate.isPending}
          >
            {downloadTemplate.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download Template
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">
          Upload File
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tarik file ke area di bawah atau klik untuk memilih.
        </p>

        <div
          {...getRootProps()}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Upload className="size-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">
              {isDragActive
                ? "Lepaskan file di sini"
                : "Seret file ke sini atau klik untuk memilih"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Format: .xlsx, .csv (Maks. 10MB)
            </p>
          </div>
        </div>

        {file && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileSpreadsheet className="size-5 shrink-0 text-primary" />
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Hapus file"
              onClick={() => setFile(null)}
              disabled={importPreview.isPending}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            disabled={!file || importPreview.isPending}
            onClick={handleProcessFile}
          >
            {importPreview.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Memproses file...
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Proses File
              </>
            )}
          </Button>
        </div>

        {importPreview.isError && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {importPreview.error instanceof Error
              ? importPreview.error.message
              : "Gagal memproses file"}
          </div>
        )}
      </div>
    </div>
  );
}
