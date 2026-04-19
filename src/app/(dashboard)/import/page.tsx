"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  History,
  Info,
  Lightbulb,
  Loader2,
  RotateCcw,
  Upload,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "@/lib/utils/toast";

import { Pagination } from "@/components/shared/pagination";
import { Progress } from "@/components/ui/progress";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDownloadTemplate,
  useImportPreview,
  useImportRollback,
  BATCH_SIZE,
  chunkArray,
  type BatchError,
  type BatchExecuteResult,
} from "@/hooks/use-import";
import { getErrorLabel } from "@/lib/utils/parse-db-error";
import { useIsMobile } from "@/hooks/use-mobile";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  DetectedColumn,
  EnhancedImportPreviewResult,
  ImportPreviewRow,
} from "@/lib/utils/excel";
import type { ApiResponse } from "@/types/api";

// ============================================================================
// Constants & Types
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PREVIEW_PAGE_SIZE = 50;
const REQUIRED_FIELDS = new Set(["nip", "nama_lengkap"]);

type ImportStep = 1 | 2 | 3 | 4;
type FilterTab = "all" | "error" | "update" | "new";
type BatchStatus = "pending" | "processing" | "completed" | "failed";

const STEPS: { step: ImportStep; label: string }[] = [
  { step: 1, label: "Upload" },
  { step: 2, label: "Mapping" },
  { step: 3, label: "Preview" },
  { step: 4, label: "Import" },
];

interface BatchLog {
  index: number;
  status: BatchStatus;
  success: number;
  errors: number;
  newAccounts: number;
  duration: number;
  errorDetails: BatchError[];
  failureMessage: string | null;
}

const DB_FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "no", label: "No" },
  { value: "nip", label: "NIP" },
  { value: "nik", label: "NIK" },
  { value: "nama_lengkap", label: "Nama Lengkap" },
  { value: "jenis_kelamin", label: "Jenis Kelamin" },
  { value: "tempat_lahir", label: "Tempat Lahir" },
  { value: "tanggal_lahir", label: "Tanggal Lahir" },
  { value: "usia", label: "Usia" },
  { value: "alamat", label: "Alamat" },
  { value: "kota_domisili", label: "Kota Domisili" },
  { value: "handphone", label: "Handphone" },
  { value: "email", label: "Email" },
  { value: "status_pegawai", label: "Status Pegawai" },
  { value: "status_kontrak", label: "Status Kontrak" },
  { value: "status_kerja", label: "Status Kerja" },
  { value: "provider", label: "Provider" },
  { value: "lokasi_kerja", label: "Lokasi Kerja" },
  { value: "cabang", label: "Cabang" },
  { value: "kode_organisasi", label: "Kode Organisasi" },
  { value: "unit_organisasi", label: "Unit Organisasi" },
  { value: "nama_organisasi", label: "Nama Organisasi" },
  { value: "sub_unit_organisasi", label: "Sub Unit Organisasi" },
  { value: "nama_jabatan", label: "Nama Jabatan" },
  { value: "unit_kerja_kontrak", label: "Unit Kerja Kontrak" },
  { value: "tmt_mulai_kerja", label: "TMT Mulai Kerja" },
  { value: "tmt_berakhir_kerja", label: "TMT Berakhir Kerja" },
  { value: "tmt_mulai_jabatan", label: "TMT Mulai Jabatan" },
  { value: "tmt_berakhir_jabatan", label: "TMT Berakhir Jabatan" },
  { value: "tmt_pensiun", label: "TMT Pensiun" },
  { value: "masa_kerja_bulan", label: "Masa Kerja (Bulan)" },
  { value: "masa_kerja_tahun", label: "Masa Kerja (Tahun)" },
  { value: "pendidikan", label: "Pendidikan" },
  { value: "instansi_pendidikan", label: "Instansi Pendidikan" },
  { value: "jurusan", label: "Jurusan" },
  { value: "remarks_pendidikan", label: "Remarks Pendidikan" },
  { value: "tahun_lulus", label: "Tahun Lulus" },
  { value: "kategori_karyawan", label: "Kategori Karyawan" },
  { value: "grade", label: "Grade" },
  { value: "no_bpjs_kesehatan", label: "No BPJS Kesehatan" },
  { value: "no_bpjs_ketenagakerjaan", label: "No BPJS Ketenagakerjaan" },
  { value: "kelompok_jabatan", label: "Kelompok Jabatan" },
  { value: "kelas_jabatan", label: "Kelas Jabatan" },
  { value: "jenis_sepatu", label: "Jenis Sepatu" },
  { value: "ukuran_sepatu", label: "Ukuran Sepatu" },
  { value: "height", label: "Height (cm)" },
  { value: "weight", label: "Weight (kg)" },
];

// ============================================================================
// Helpers
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDurationMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)} detik`;
}

function getEffectiveConfidence(
  col: DetectedColumn,
  currentField: string | null,
): "exact" | "fuzzy" | "unmapped" {
  if (currentField === null) return "unmapped";
  if (currentField === col.mappedField) return col.confidence;
  return "exact";
}

// ============================================================================
// Sub-components
// ============================================================================

function StepIndicator({
  currentStep,
  completedSteps,
}: {
  currentStep: ImportStep;
  completedSteps: ReadonlySet<number>;
}) {
  const isMobile = useIsMobile();
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map(({ step, label }, idx) => {
        const isCompleted = completedSteps.has(step);
        const isActive = step === currentStep;
        return (
          <Fragment key={step}>
            {idx > 0 && (
              <div
                className={cn(
                  "h-0.5 w-6 sm:w-12 md:w-16",
                  isCompleted || isActive ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  isCompleted
                    ? "bg-primary/15 text-primary"
                    : isActive
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-4" /> : step}
              </div>
              {!isMobile && (
                <span
                  className={cn(
                    "text-[11px] font-medium whitespace-nowrap",
                    isActive
                      ? "text-primary"
                      : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "green" | "red" | "blue" | "emerald";
}

const TONE_STYLES: Record<
  SummaryCardProps["tone"],
  { bg: string; text: string }
> = {
  green: { bg: "bg-green-50 border-green-200", text: "text-green-700" },
  red: { bg: "bg-red-50 border-red-200", text: "text-red-700" },
  blue: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  emerald: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
};

function SummaryCard({ icon, label, value, tone }: SummaryCardProps) {
  const style = TONE_STYLES[tone];
  return (
    <div className={cn("flex-1 min-w-[110px] rounded-xl border px-3 py-3 sm:px-4", style.bg)}>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
          {label}
        </p>
      </div>
      <p className={cn("mt-1 text-xl font-bold tabular-nums sm:text-2xl", style.text)}>
        {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

function InfoAlert() {
  return (
    <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <Info className="mt-0.5 size-5 shrink-0 text-blue-600" />
      <div>
        <p className="text-sm font-semibold text-blue-800">
          Informasi Penting
        </p>
        <p className="mt-0.5 text-sm text-blue-700">
          Setiap karyawan yang berhasil di-import akan otomatis dibuatkan akun
          login. Username = NIP karyawan, Password = NIP karyawan.
        </p>
      </div>
    </div>
  );
}

function ConfidenceIcon({
  confidence,
}: {
  confidence: "exact" | "fuzzy" | "unmapped";
}) {
  if (confidence === "exact")
    return <Check className="size-4 text-green-600" />;
  if (confidence === "fuzzy")
    return <AlertTriangle className="size-4 text-amber-500" />;
  return <X className="size-4 text-red-500" />;
}

function ConfidenceLabel({
  confidence,
}: {
  confidence: "exact" | "fuzzy" | "unmapped";
}) {
  if (confidence === "exact")
    return <span className="text-xs font-medium text-green-600">Cocok</span>;
  if (confidence === "fuzzy")
    return <span className="text-xs font-medium text-amber-600">Mirip</span>;
  return <span className="text-xs font-medium text-red-500">Belum</span>;
}

interface DuplicateInFileWarningProps {
  kind: "NIP" | "NIK";
  duplicates: { value: string; rows: number[] }[];
}

function DuplicateInFileWarning({
  kind,
  duplicates,
}: DuplicateInFileWarningProps) {
  const visible = duplicates.slice(0, 10);
  const extra = duplicates.length - visible.length;
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900">
          Ditemukan {duplicates.length.toLocaleString("id-ID")} {kind} Duplikat
          di File
        </p>
        <p className="mt-0.5 text-sm text-amber-800">
          File Anda mengandung {kind} yang sama di beberapa baris. Hanya baris
          pertama yang akan di-import, sisanya akan di-skip atau error.
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-amber-900 underline">
            Lihat detail
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {visible.map((d) => (
              <li key={d.value}>
                <span className="font-mono font-semibold">{kind} {d.value}</span>{" "}
                muncul di baris: {d.rows.join(", ")}
              </li>
            ))}
            {extra > 0 && (
              <li className="italic">
                ... dan {extra.toLocaleString("id-ID")} lainnya
              </li>
            )}
          </ul>
        </details>
      </div>
    </div>
  );
}

function ActionBadge({ row }: { row: ImportPreviewRow }) {
  if (row.status === "error") {
    return (
      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
        Error
      </span>
    );
  }
  if (!row.data.nama_lengkap) {
    return (
      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
        Skip
      </span>
    );
  }
  if (row.isExistingNip) {
    return (
      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
        Update
      </span>
    );
  }
  return (
    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-green-700">
      Insert
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ImportPage() {
  // -- Step management --
  const [step, setStep] = useState<ImportStep>(1);
  const completedSteps = useMemo(() => {
    const s = new Set<number>();
    for (let i = 1; i < step; i++) s.add(i);
    return s;
  }, [step]);

  // -- Step 1: Upload --
  const [file, setFile] = useState<File | null>(null);
  const downloadTemplate = useDownloadTemplate();
  const importPreview = useImportPreview();
  const preview = importPreview.data as
    | EnhancedImportPreviewResult
    | undefined;

  // -- Step 2: Mapping --
  const [columnMapping, setColumnMapping] = useState<
    Map<string, string | null>
  >(new Map());

  // -- Step 3: Preview --
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [previewPage, setPreviewPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // -- Step 4: Import --
  const [batchLogs, setBatchLogs] = useState<BatchLog[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [totalSuccess, setTotalSuccess] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [importLogId, setImportLogId] = useState<string | null>(null);

  // -- Rollback --
  const [isRollbackConfirmOpen, setIsRollbackConfirmOpen] = useState(false);
  const [isRolledBack, setIsRolledBack] = useState(false);
  const rollbackMutation = useImportRollback();

  const isMobile = useIsMobile();
  const errorSectionRef = useRef<HTMLDivElement>(null);
  const batchLogEndRef = useRef<HTMLDivElement>(null);

  // Init column mapping from preview
  useEffect(() => {
    if (preview?.detectedColumns) {
      const mapping = new Map<string, string | null>();
      for (const col of preview.detectedColumns) {
        mapping.set(col.excelHeader, col.mappedField);
      }
      setColumnMapping(mapping);
    }
  }, [preview?.detectedColumns]);

  // Prevent page close during import
  useEffect(() => {
    if (!isImporting) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isImporting]);

  // Auto-scroll batch log
  useEffect(() => {
    if (isImporting) {
      batchLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [batchLogs, isImporting]);

  // ---- File handling ----
  function onDrop(accepted: File[], rejections: FileRejection[]) {
    if (rejections.length > 0) {
      const code = rejections[0]?.errors[0]?.code;
      if (code === "file-too-large")
        toast.error("Ukuran file melebihi 10MB");
      else if (code === "file-invalid-type")
        toast.error("Format file harus .xlsx atau .csv");
      else toast.error("File tidak dapat diterima");
      return;
    }
    const selected = accepted[0];
    if (selected) {
      setFile(selected);
      importPreview.mutate(selected, {
        onSuccess: () => setStep(2),
      });
    }
  }

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

  // ---- Navigation ----
  function handleBackToUpload() {
    setStep(1);
    setFile(null);
    importPreview.reset();
    setColumnMapping(new Map());
  }

  function handleBackToMapping() {
    setStep(2);
    setFilterTab("all");
    setPreviewPage(1);
    setExpandedRows(new Set());
  }

  function handleResetAll() {
    setStep(1);
    setFile(null);
    importPreview.reset();
    setColumnMapping(new Map());
    setFilterTab("all");
    setPreviewPage(1);
    setExpandedRows(new Set());
    setBatchLogs([]);
    setIsImporting(false);
    setImportComplete(false);
    setTotalSuccess(0);
    setTotalErrors(0);
    setTotalAccounts(0);
    setImportLogId(null);
    setIsRolledBack(false);
    rollbackMutation.reset();
  }

  // ---- Mapping ----
  function handleMappingChange(excelHeader: string, newField: string) {
    setColumnMapping((prev) => {
      const next = new Map(prev);
      next.set(excelHeader, newField === "__skip__" || !newField ? null : newField);
      return next;
    });
  }

  const mappedFields = useMemo(
    () =>
      new Set(
        Array.from(columnMapping.values()).filter(
          (v): v is string => v !== null,
        ),
      ),
    [columnMapping],
  );

  const requiredFieldsMapped = useMemo(
    () => Array.from(REQUIRED_FIELDS).every((f) => mappedFields.has(f)),
    [mappedFields],
  );

  const autoMappedCount = useMemo(
    () =>
      preview?.detectedColumns.filter((c) => c.confidence !== "unmapped")
        .length ?? 0,
    [preview],
  );

  const unmappedCount = useMemo(
    () =>
      preview?.detectedColumns.filter((c) => c.confidence === "unmapped")
        .length ?? 0,
    [preview],
  );

  // ---- Preview filtering ----
  const filteredRows = useMemo<ImportPreviewRow[]>(() => {
    if (!preview) return [];
    switch (filterTab) {
      case "error":
        return preview.rows.filter((r) => r.status === "error");
      case "update":
        return preview.rows.filter(
          (r) => r.isExistingNip && r.status !== "error",
        );
      case "new":
        return preview.rows.filter(
          (r) =>
            !r.isExistingNip && r.status !== "error" && r.data.nama_lengkap,
        );
      default:
        return preview.rows;
    }
  }, [preview, filterTab]);

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

  // ---- Batch Import ----
  async function startBatchImport() {
    if (!preview || !file) return;
    setIsConfirmOpen(false);
    setStep(4);
    setIsImporting(true);
    setImportComplete(false);
    setTotalSuccess(0);
    setTotalErrors(0);
    setTotalAccounts(0);
    setImportLogId(null);
    setIsRolledBack(false);

    const validRows = preview.rows
      .filter((r) => r.status === "valid" || r.status === "warning")
      .map((r) => ({
        rowNumber: r.rowNumber,
        data: r.data,
        isExistingNip: r.isExistingNip,
      }));

    const chunks = chunkArray(validRows, BATCH_SIZE);
    const totalBatches = chunks.length;

    const initialLogs: BatchLog[] = chunks.map((_, i) => ({
      index: i,
      status: "pending" as const,
      success: 0,
      errors: 0,
      newAccounts: 0,
      duration: 0,
      errorDetails: [],
      failureMessage: null,
    }));
    setBatchLogs(initialLogs);

    let logId: string | null = null;
    let accSuccess = 0;
    let accErrors = 0;
    let accAccounts = 0;

    for (let i = 0; i < totalBatches; i++) {
      setBatchLogs((prev) =>
        prev.map((l, idx) =>
          idx === i ? { ...l, status: "processing" } : l,
        ),
      );

      const startTime = Date.now();
      let result: BatchExecuteResult | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("/api/import/execute-batch", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rows: chunks[i],
              batchIndex: i,
              totalBatches,
              importLogId: logId ?? undefined,
              fileName: file.name,
            }),
          });

          const contentType = res.headers.get("content-type") ?? "";
          if (!contentType.includes("application/json")) {
            throw new Error(
              "Server timeout. Batch terlalu besar atau koneksi lambat. Coba lagi.",
            );
          }

          let json: ApiResponse<BatchExecuteResult>;
          try {
            json = (await res.json()) as ApiResponse<BatchExecuteResult>;
          } catch {
            throw new Error(
              "Server timeout. Batch terlalu besar atau koneksi lambat. Coba lagi.",
            );
          }

          if (!json.success) throw new Error(json.error.message);
          result = json.data;
          break;
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Kesalahan tidak diketahui";
          const isTimeout = /timeout/i.test(errorMsg);

          if (attempt === 0 && isTimeout) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            continue;
          }

          if (attempt === 1 || !isTimeout) {
            const duration = Date.now() - startTime;
            const batchSize = chunks[i]!.length;
            accErrors += batchSize;
            setBatchLogs((prev) =>
              prev.map((l, idx) =>
                idx === i
                  ? {
                      ...l,
                      status: "failed",
                      errors: batchSize,
                      duration,
                      errorDetails: [],
                      failureMessage: errorMsg,
                    }
                  : l,
              ),
            );
            setTotalErrors(accErrors);
            break;
          }
        }
      }

      if (result) {
        const duration = Date.now() - startTime;
        logId = result.importLogId;
        accSuccess += result.batchSuccess;
        accErrors += result.batchErrors;
        accAccounts += result.newAccounts;

        setBatchLogs((prev) =>
          prev.map((l, idx) =>
            idx === i
              ? {
                  ...l,
                  status: "completed",
                  success: result!.batchSuccess,
                  errors: result!.batchErrors,
                  newAccounts: result!.newAccounts,
                  duration,
                  errorDetails: result!.errors,
                  failureMessage: null,
                }
              : l,
          ),
        );

        setTotalSuccess(accSuccess);
        setTotalErrors(accErrors);
        setTotalAccounts(accAccounts);
        setImportLogId(logId);
      }
    }

    setIsImporting(false);
    setImportComplete(true);

    if (accErrors === 0) {
      toast.success(
        `${accSuccess.toLocaleString("id-ID")} data berhasil diimport`,
      );
    } else if (accSuccess === 0) {
      toast.error("Import gagal. Semua baris mengalami error.");
    } else {
      toast.warning(`Import selesai dengan ${accErrors} error`);
    }
  }

  // ---- Rollback ----
  function handleRollback() {
    if (!importLogId) return;
    setIsRollbackConfirmOpen(false);
    rollbackMutation.mutate(
      { importLogId },
      { onSuccess: () => setIsRolledBack(true) },
    );
  }

  // ---- Error Report ----
  function handleDownloadErrorReport() {
    const allErrors = batchLogs.flatMap((l) => l.errorDetails);
    if (allErrors.length === 0) return;

    const headers = [
      "Row",
      "NIP",
      "Nama Lengkap",
      "Kategori Error",
      "Field Bermasalah",
      "Nilai",
      "Pesan Error",
      "Detail",
      "Saran Perbaikan",
    ];

    const escape = (v: string | number | null | undefined): string => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = allErrors.map((e) =>
      [
        e.rowNumber,
        e.nip,
        e.namaLengkap,
        getErrorLabel(e.errorCode),
        e.field ?? "-",
        e.value ?? "-",
        e.message,
        e.detail ?? "-",
        e.suggestion ?? "-",
      ]
        .map(escape)
        .join(","),
    );

    const csvContent = [headers.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    link.download = `import-errors-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ---- Row expand ----
  function toggleRowExpanded(rowNumber: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  }

  // ======================================================================
  // STEP 4: Import Progress & Results
  // ======================================================================
  if (step === 4) {
    const processedCount = batchLogs.reduce(
      (sum, l) => sum + l.success + l.errors,
      0,
    );
    const completedBatches = batchLogs.filter(
      (l) => l.status === "completed" || l.status === "failed",
    ).length;
    const progressPercent =
      batchLogs.length > 0
        ? Math.round((completedBatches / batchLogs.length) * 100)
        : 0;
    const allErrors = batchLogs.flatMap((l) => l.errorDetails);
    const hasAnyErrors = allErrors.length > 0;

    const errorSummary = Object.entries(
      allErrors.reduce<Record<string, number>>((acc, e) => {
        acc[e.errorCode] = (acc[e.errorCode] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([code, count]) => ({ code, count, label: getErrorLabel(code) }))
      .sort((a, b) => b.count - a.count);

    return (
      <div className="space-y-6">
        <StepIndicator currentStep={4} completedSteps={completedSteps} />

        {!importComplete ? (
          <>
            <div className="space-y-1 text-center">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                Proses Import
              </h1>
              <p className="text-sm text-muted-foreground">
                Mengimport data ke database dalam beberapa batch.
              </p>
            </div>

            <div className="mx-auto max-w-lg space-y-3">
              <Progress value={progressPercent} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Batch{" "}
                  {Math.min(completedBatches + 1, batchLogs.length)} dari{" "}
                  {batchLogs.length}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {progressPercent}%
                </span>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {processedCount.toLocaleString("id-ID")} /{" "}
                {importableCount.toLocaleString("id-ID")} karyawan diproses
              </p>
              <div className="flex flex-wrap justify-center gap-3 text-sm sm:gap-4">
                <span className="text-green-700">
                  Berhasil:{" "}
                  <strong className="tabular-nums">
                    {totalSuccess.toLocaleString("id-ID")}
                  </strong>
                </span>
                <span className="text-red-700">
                  Gagal:{" "}
                  <strong className="tabular-nums">
                    {totalErrors.toLocaleString("id-ID")}
                  </strong>
                </span>
                <span className="text-blue-700">
                  Akun Baru:{" "}
                  <strong className="tabular-nums">
                    {totalAccounts.toLocaleString("id-ID")}
                  </strong>
                </span>
              </div>
            </div>

            {/* Batch log */}
            <div className="mx-auto max-w-lg rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Log Progress
                </p>
              </div>
              <div className="max-h-[300px] space-y-1.5 overflow-y-auto p-3">
                {batchLogs.map((log) => (
                  <div key={log.index} className="text-xs sm:text-sm">
                    {log.status === "completed" && log.errors === 0 && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-600" />
                        <div>
                          <span className="font-medium text-green-700">
                            Batch {log.index + 1}: {log.success} berhasil
                          </span>
                          <p className="text-xs text-muted-foreground">
                            ({formatDurationMs(log.duration)})
                          </p>
                        </div>
                      </div>
                    )}
                    {log.status === "completed" && log.errors > 0 && (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                        <div>
                          <span className="font-medium text-amber-700">
                            Batch {log.index + 1}: {log.success} berhasil,{" "}
                            {log.errors} gagal
                          </span>
                          <p className="text-xs text-muted-foreground">
                            ({formatDurationMs(log.duration)})
                          </p>
                        </div>
                      </div>
                    )}
                    {log.status === "failed" && (
                      <div className="flex items-start gap-2">
                        <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                        <div>
                          <span className="font-medium text-red-700">
                            Batch {log.index + 1}: Gagal
                          </span>
                          <p className="mt-0.5 text-xs text-red-600">
                            {log.failureMessage ??
                              "Terjadi kesalahan saat memproses batch ini"}
                          </p>
                        </div>
                      </div>
                    )}
                    {log.status === "processing" && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                        <span className="text-foreground">
                          Batch {log.index + 1}: Memproses...
                        </span>
                      </div>
                    )}
                    {log.status === "pending" && (
                      <div className="flex items-center gap-2 text-muted-foreground/50">
                        <div className="size-3.5 rounded-full border border-current" />
                        <span>Batch {log.index + 1}: Menunggu...</span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={batchLogEndRef} />
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Jangan tutup atau refresh halaman ini sampai proses selesai.
            </p>
          </>
        ) : (
          <>
            {/* ---- Import Complete ---- */}
            <div className="space-y-1 text-center">
              <h1 className="flex items-center justify-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
                <CheckCircle2 className="size-7 text-primary" />
                Import Selesai
              </h1>
              <p className="text-sm text-muted-foreground">
                Ringkasan hasil import data karyawan.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SummaryCard
                icon={<CheckCircle2 className="size-4 text-green-600" />}
                label="Berhasil"
                value={totalSuccess}
                tone="green"
              />
              {totalErrors > 0 && (
                <SummaryCard
                  icon={<XCircle className="size-4 text-red-600" />}
                  label="Gagal"
                  value={totalErrors}
                  tone="red"
                />
              )}
              <SummaryCard
                icon={<UserPlus className="size-4 text-blue-600" />}
                label="Akun Baru"
                value={totalAccounts}
                tone="blue"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              {hasAnyErrors && (
                <Button
                  variant="outline"
                  onClick={() =>
                    errorSectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                >
                  <XCircle className="size-4" />
                  Lihat Detail Error
                </Button>
              )}
              <Button render={<Link href={ROUTES.EMPLOYEES} />}>
                <Users className="size-4" />
                Lihat Data Karyawan
              </Button>
              <Button variant="outline" onClick={handleResetAll}>
                <RotateCcw className="size-4" />
                Import Lagi
              </Button>
              {importLogId && !isRolledBack && (
                <Button
                  variant="destructive"
                  onClick={() => setIsRollbackConfirmOpen(true)}
                  disabled={rollbackMutation.isPending}
                >
                  {rollbackMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  Rollback Import
                </Button>
              )}
              {isRolledBack && (
                <Button variant="outline" disabled>
                  <Check className="size-4" />
                  Import sudah di-rollback
                </Button>
              )}
            </div>

            {/* Error details */}
            {hasAnyErrors && (
              <div
                ref={errorSectionRef}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="flex flex-col gap-2 border-b border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Detail Error ({allErrors.length.toLocaleString("id-ID")}{" "}
                      row gagal)
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Daftar karyawan yang gagal di-import beserta alasannya.
                    </p>
                  </div>
                  {allErrors.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadErrorReport}
                    >
                      <Download className="size-4" />
                      Download Laporan Error
                    </Button>
                  )}
                </div>

                {errorSummary.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 border-b border-border bg-muted/10 px-4 py-3 sm:grid-cols-4">
                    {errorSummary.map((summary) => (
                      <div
                        key={summary.code}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2"
                      >
                        <p className="text-[11px] font-medium text-red-700">
                          {summary.label}
                        </p>
                        <p className="mt-0.5 text-xl font-bold tabular-nums text-red-900">
                          {summary.count.toLocaleString("id-ID")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {allErrors.length > 0 ? (
                  <div className="max-h-[500px] space-y-2 overflow-y-auto p-3">
                    {allErrors.map((err, idx) => (
                      <div
                        key={`${err.rowNumber}-${idx}`}
                        className="rounded-lg border border-red-200 bg-red-50/50 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="rounded border border-red-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                              Row {err.rowNumber}
                            </span>
                            <span className="font-mono text-xs text-gray-600 sm:text-sm">
                              {err.nip}
                            </span>
                            <span className="truncate text-xs font-medium text-gray-900 sm:text-sm">
                              {err.namaLengkap}
                            </span>
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                              {getErrorLabel(err.errorCode)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-red-900">
                            {err.message}
                          </p>
                          {err.detail && (
                            <p className="mt-1 text-xs text-red-700">
                              {err.detail}
                            </p>
                          )}
                          {err.suggestion && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-blue-700">
                              <Lightbulb className="mt-0.5 size-3 shrink-0" />
                              <span>{err.suggestion}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 p-4">
                    {batchLogs
                      .filter((l) => l.failureMessage)
                      .map((l) => (
                        <div
                          key={`fail-${l.index}`}
                          className="rounded-lg border border-red-200 bg-red-50/50 p-3"
                        >
                          <p className="text-sm font-semibold text-red-900">
                            Batch {l.index + 1}: Gagal
                          </p>
                          <p className="mt-1 text-xs text-red-700">
                            {l.failureMessage}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Batch summary */}
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Log Batch
                </p>
              </div>
              <div className="max-h-[300px] space-y-1.5 overflow-y-auto p-3">
                {batchLogs.map((log) => {
                  const isSuccess = log.status === "completed" && log.errors === 0;
                  const isPartial = log.status === "completed" && log.errors > 0;
                  return (
                    <div
                      key={log.index}
                      className="flex items-start gap-2 text-sm"
                    >
                      {isSuccess && (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-600" />
                      )}
                      {isPartial && (
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                      )}
                      {log.status === "failed" && (
                        <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                      )}
                      <span
                        className={cn(
                          isSuccess && "text-green-700",
                          isPartial && "text-amber-700",
                          log.status === "failed" && "text-red-700",
                        )}
                      >
                        Batch {log.index + 1}:{" "}
                        {log.status === "failed"
                          ? "Gagal"
                          : `${log.success} berhasil${log.errors > 0 ? `, ${log.errors} gagal` : ""}`}{" "}
                        ({formatDurationMs(log.duration)})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Rollback confirm dialog */}
        <AlertDialog
          open={isRollbackConfirmOpen}
          onOpenChange={setIsRollbackConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Rollback</AlertDialogTitle>
              <AlertDialogDescription>
                Yakin ingin membatalkan import ini? Data karyawan yang
                di-import akan dihapus dan data yang di-update akan
                dikembalikan ke kondisi semula. Akun login yang dibuat otomatis
                juga akan dihapus.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleRollback();
                }}
              >
                Ya, Rollback
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ======================================================================
  // STEP 3: Preview & Validasi
  // ======================================================================
  if (step === 3 && preview) {
    return (
      <div className="space-y-6">
        <StepIndicator currentStep={3} completedSteps={completedSteps} />

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Preview Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Review data sebelum import. Perbaiki error jika ada.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            icon={<CheckCircle2 className="size-4 text-green-600" />}
            label="Valid"
            value={preview.summary.validCount + preview.summary.warningCount}
            tone="green"
          />
          <SummaryCard
            icon={<XCircle className="size-4 text-red-600" />}
            label="Error"
            value={preview.summary.errorCount}
            tone="red"
          />
          <SummaryCard
            icon={<RotateCcw className="size-4 text-blue-600" />}
            label="Update"
            value={preview.summary.updateCount}
            tone="blue"
          />
          <SummaryCard
            icon={<UserPlus className="size-4 text-emerald-600" />}
            label="Baru"
            value={preview.summary.newCount}
            tone="emerald"
          />
        </div>

        {/* Warnings: duplicate NIP/NIK in file */}
        {preview.warnings?.duplicateNipInFile &&
          preview.warnings.duplicateNipInFile.length > 0 && (
            <DuplicateInFileWarning
              kind="NIP"
              duplicates={preview.warnings.duplicateNipInFile}
            />
          )}
        {preview.warnings?.duplicateNikInFile &&
          preview.warnings.duplicateNikInFile.length > 0 && (
            <DuplicateInFileWarning
              kind="NIK"
              duplicates={preview.warnings.duplicateNikInFile}
            />
          )}

        {/* Filter tabs */}
        <Tabs
          value={filterTab}
          onValueChange={(v) => {
            setFilterTab(v as FilterTab);
            setPreviewPage(1);
            setExpandedRows(new Set());
          }}
        >
          <div className="overflow-x-auto">
            <TabsList className="h-auto w-auto justify-start gap-1 bg-muted/60 p-1">
              <TabsTrigger
                value="all"
                className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
              >
                Semua ({preview.summary.totalRows})
              </TabsTrigger>
              <TabsTrigger
                value="error"
                className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
              >
                Error ({preview.summary.errorCount})
              </TabsTrigger>
              <TabsTrigger
                value="update"
                className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
              >
                Update ({preview.summary.updateCount})
              </TabsTrigger>
              <TabsTrigger
                value="new"
                className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
              >
                Baru ({preview.summary.newCount})
              </TabsTrigger>
            </TabsList>
          </div>
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
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    NIP
                  </TableHead>
                  <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nama
                  </TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status Pegawai
                  </TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit
                  </TableHead>
                  <TableHead className="w-[70px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Aksi
                  </TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
                      row.status === "error"
                        ? "bg-red-50/50"
                        : row.isExistingNip
                          ? "bg-blue-50/30"
                          : row.data.nama_lengkap
                            ? "bg-green-50/30"
                            : "bg-gray-50/30";
                    return (
                      <Fragment key={row.rowNumber}>
                        <TableRow
                          className={cn(rowBg, "hover:bg-opacity-80")}
                        >
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {row.data.nip ?? (
                              <span className="text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-foreground">
                            {row.data.nama_lengkap ?? (
                              <span className="text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.data.status_pegawai ?? (
                              <span className="text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.data.unit_organisasi ?? (
                              <span className="text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ActionBadge row={row} />
                          </TableCell>
                          <TableCell>
                            {hasDetail && (
                              <button
                                type="button"
                                onClick={() =>
                                  toggleRowExpanded(row.rowNumber)
                                }
                                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                                aria-label="Detail"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="size-4" />
                                ) : (
                                  <ChevronRight className="size-4" />
                                )}
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && hasDetail && (
                          <TableRow
                            className={cn(rowBg, "hover:bg-opacity-80")}
                          >
                            <TableCell colSpan={7} className="px-6 py-3">
                              <div className="space-y-2 text-sm">
                                {row.validation.errors.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase text-red-700">
                                      Error
                                    </p>
                                    <ul className="mt-1 space-y-0.5">
                                      {row.validation.errors.map((e, i) => (
                                        <li
                                          key={i}
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
                                        (w, i) => (
                                          <li
                                            key={i}
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

        {filteredRows.length > PREVIEW_PAGE_SIZE && (
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
          <Button variant="outline" onClick={handleBackToMapping}>
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
                onClick={(e) => {
                  e.preventDefault();
                  startBatchImport();
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

  // ======================================================================
  // STEP 2: Column Mapping
  // ======================================================================
  if (step === 2 && preview) {
    return (
      <div className="space-y-6">
        <StepIndicator currentStep={2} completedSteps={completedSteps} />

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Mapping Kolom
          </h1>
          <p className="text-sm text-muted-foreground">
            Pastikan kolom di file Excel Anda sesuai dengan field database.
          </p>
        </div>

        {isMobile ? (
          /* ---- Mobile: Card view ---- */
          <div className="space-y-2.5">
            {preview.detectedColumns.map((col) => {
              const currentField = columnMapping.get(col.excelHeader) ?? null;
              const confidence = getEffectiveConfidence(col, currentField);
              const usedByOthers = new Set(
                Array.from(columnMapping.entries())
                  .filter(
                    ([key, val]) =>
                      key !== col.excelHeader && val !== null,
                  )
                  .map(([, val]) => val),
              );

              return (
                <div
                  key={col.excelHeader}
                  className="space-y-2 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-foreground">
                      {col.excelHeader.split(/\r?\n/)[0]}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <ConfidenceIcon confidence={confidence} />
                      <ConfidenceLabel confidence={confidence} />
                    </div>
                  </div>
                  <select
                    className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                    value={currentField ?? "__skip__"}
                    onChange={(e) =>
                      handleMappingChange(col.excelHeader, e.target.value)
                    }
                  >
                    <option value="__skip__">Abaikan kolom ini</option>
                    {DB_FIELD_OPTIONS.filter(
                      (f) =>
                        !usedByOthers.has(f.value) ||
                        f.value === currentField,
                    ).map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        ) : (
          /* ---- Desktop: Table view ---- */
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Kolom Excel
                    </TableHead>
                    <TableHead className="w-[40px] text-center text-muted-foreground">
                      &rarr;
                    </TableHead>
                    <TableHead className="min-w-[220px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Field Database
                    </TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.detectedColumns.map((col) => {
                    const currentField =
                      columnMapping.get(col.excelHeader) ?? null;
                    const confidence = getEffectiveConfidence(
                      col,
                      currentField,
                    );
                    const usedByOthers = new Set(
                      Array.from(columnMapping.entries())
                        .filter(
                          ([key, val]) =>
                            key !== col.excelHeader && val !== null,
                        )
                        .map(([, val]) => val),
                    );

                    return (
                      <TableRow key={col.excelHeader}>
                        <TableCell className="text-sm font-medium text-foreground">
                          {col.excelHeader.split(/\r?\n/)[0]}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          &rarr;
                        </TableCell>
                        <TableCell>
                          <select
                            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                            value={currentField ?? "__skip__"}
                            onChange={(e) =>
                              handleMappingChange(
                                col.excelHeader,
                                e.target.value,
                              )
                            }
                          >
                            <option value="__skip__">
                              Abaikan kolom ini
                            </option>
                            {DB_FIELD_OPTIONS.filter(
                              (f) =>
                                !usedByOthers.has(f.value) ||
                                f.value === currentField,
                            ).map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <ConfidenceIcon confidence={confidence} />
                            <ConfidenceLabel confidence={confidence} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Summary */}
        <p className="text-sm text-muted-foreground">
          Terdeteksi:{" "}
          <span className="font-semibold text-foreground">
            {autoMappedCount}/{preview.detectedColumns.length}
          </span>{" "}
          kolom otomatis.
          {unmappedCount > 0 && (
            <>
              {" "}
              <span className="font-semibold text-amber-600">
                {unmappedCount}
              </span>{" "}
              kolom perlu mapping manual.
            </>
          )}
        </p>

        {!requiredFieldsMapped && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">
              Field wajib <strong>NIP</strong> dan{" "}
              <strong>Nama Lengkap</strong> harus di-mapping sebelum
              melanjutkan.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={handleBackToUpload}>
            <ArrowLeft className="size-4" />
            Kembali
          </Button>
          <Button
            disabled={!requiredFieldsMapped}
            onClick={() => {
              setStep(3);
              setFilterTab("all");
              setPreviewPage(1);
              setExpandedRows(new Set());
            }}
          >
            Lanjut ke Preview
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ======================================================================
  // STEP 1: Upload File
  // ======================================================================
  return (
    <div className="space-y-6">
      <StepIndicator currentStep={1} completedSteps={completedSteps} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            <FileSpreadsheet className="size-6 text-primary sm:size-7" />
            Upload File Excel / CSV
          </h1>
          <p className="text-sm text-muted-foreground">
            Pilih atau seret file untuk memulai import data karyawan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTemplate.mutate()}
            disabled={downloadTemplate.isPending}
          >
            {downloadTemplate.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            <span className="hidden sm:inline">Download Template</span>
            <span className="sm:hidden">Template</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/import/logs" />}
          >
            <History className="size-4" />
            <span className="hidden sm:inline">Riwayat Import</span>
            <span className="sm:hidden">Riwayat</span>
          </Button>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors",
          importPreview.isPending && "pointer-events-none opacity-60",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <input {...getInputProps()} disabled={importPreview.isPending} />
        {importPreview.isPending ? (
          <>
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">
                Memproses file...
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Validasi dan analisis kolom sedang berjalan.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <FileSpreadsheet className="size-8 text-primary" />
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
          </>
        )}
      </div>

      {/* Selected file info */}
      {file && !importPreview.isPending && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
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
            onClick={() => {
              setFile(null);
              importPreview.reset();
            }}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {importPreview.isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {importPreview.error instanceof Error
            ? importPreview.error.message
            : "Gagal memproses file"}
        </div>
      )}

      <InfoAlert />
    </div>
  );
}
