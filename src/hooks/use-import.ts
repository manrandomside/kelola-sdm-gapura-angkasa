"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/utils/toast";

import type { ApiResponse } from "@/types/api";
import type {
  EnhancedImportPreviewResult,
  ImportPreviewResult,
  NormalizedRow,
} from "@/lib/utils/excel";

// ============================================================================
// Constants & Helpers
// ============================================================================

export const BATCH_SIZE = 10;

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ============================================================================
// useDownloadTemplate — fetch /api/import/template lalu trigger download
// browser. Mutation karena ini side effect (bukan data fetch).
// ============================================================================
async function downloadTemplate(): Promise<void> {
  const res = await fetch("/api/import/template", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    try {
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.success) throw new Error(json.error.message);
    } catch {
      // Fallthrough.
    }
    throw new Error("Gagal mengunduh template");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-import-sdm-gapura-angkasa.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useDownloadTemplate() {
  return useMutation({
    mutationFn: downloadTemplate,
    onSuccess: () => {
      toast.success("Template berhasil diunduh");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal mengunduh template";
      toast.error(message);
    },
  });
}

// ============================================================================
// useImportPreview — upload file ke /api/import/preview, return enhanced
// preview data with per-cell validation, duplicate detection, column mapping.
// ============================================================================
async function uploadPreviewFile(file: File): Promise<EnhancedImportPreviewResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/import/preview", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const json = (await res.json()) as ApiResponse<EnhancedImportPreviewResult>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export function useImportPreview() {
  return useMutation({
    mutationFn: (file: File) => uploadPreviewFile(file),
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal memproses file";
      toast.error(message);
    },
  });
}

// ============================================================================
// useImportExecute — kirim row yang valid + warning ke /api/import/execute.
// Kept for backward compatibility with existing import flow.
// ============================================================================
export interface ImportExecuteRow {
  rowNumber: number;
  data: NormalizedRow;
  isExistingNip: boolean;
}

export interface ImportRowError {
  rowNumber: number;
  nip: string | null;
  nama_lengkap: string | null;
  error: string;
}

export interface ImportExecuteResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  accountsCreated: number;
  accountsSkipped: number;
  errors: ImportRowError[];
  importLogId: string;
}

export interface ImportExecutePayload {
  rows: ImportExecuteRow[];
  fileName: string;
}

async function executeImport(
  payload: ImportExecutePayload,
): Promise<ImportExecuteResult> {
  const res = await fetch("/api/import/execute", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ApiResponse<ImportExecuteResult>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export function useImportExecute() {
  return useMutation({
    mutationFn: (payload: ImportExecutePayload) => executeImport(payload),
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal mengeksekusi import";
      toast.error(message);
    },
  });
}

// ============================================================================
// useImportBatch — mutation untuk POST /api/import/execute-batch.
// Processes one batch at a time, max 10 rows per batch.
// ============================================================================

export interface BatchExecuteRow {
  rowNumber: number;
  data: NormalizedRow;
  isExistingNip?: boolean;
}

export interface BatchError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface BatchExecutePayload {
  rows: BatchExecuteRow[];
  batchIndex: number;
  totalBatches: number;
  importLogId?: string;
  fileName: string;
}

export interface BatchExecuteResult {
  importLogId: string;
  batchIndex: number;
  batchSuccess: number;
  batchErrors: number;
  batchSkipped: number;
  errors: BatchError[];
  newAccounts: number;
  updatedRecords: number;
  insertedRecords: number;
}

async function executeBatch(
  payload: BatchExecutePayload,
): Promise<BatchExecuteResult> {
  const res = await fetch("/api/import/execute-batch", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export function useImportBatch() {
  return useMutation({
    mutationFn: (payload: BatchExecutePayload) => executeBatch(payload),
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal mengeksekusi batch import";
      toast.error(message);
    },
  });
}

// ============================================================================
// useImportRollback — mutation untuk POST /api/import/rollback.
// ============================================================================

export interface RollbackPayload {
  importLogId: string;
}

export interface RollbackResult {
  deletedEmployees: number;
  restoredEmployees: number;
  deletedAccounts: number;
  message: string;
}

async function rollbackImport(
  payload: RollbackPayload,
): Promise<RollbackResult> {
  const res = await fetch("/api/import/rollback", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ApiResponse<RollbackResult>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export function useImportRollback() {
  return useMutation({
    mutationFn: (payload: RollbackPayload) => rollbackImport(payload),
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal melakukan rollback import";
      toast.error(message);
    },
  });
}

// ============================================================================
// useImportLogs — fetch riwayat import untuk halaman /import/logs.
// ============================================================================
export interface ImportLogItem {
  id: string;
  user_id: string | null;
  user_name: string | null;
  file_name: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  skipped_count: number;
  error_details: ImportRowError[] | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ImportLogListData {
  logs: ImportLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseImportLogsParams {
  page: number;
  limit: number;
}

async function fetchImportLogs(
  params: UseImportLogsParams,
): Promise<ImportLogListData> {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));

  const res = await fetch(`/api/import/logs?${sp.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const json = (await res.json()) as ApiResponse<ImportLogListData>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export function useImportLogs(params: UseImportLogsParams) {
  const query = useQuery({
    queryKey: ["import-logs", params],
    queryFn: () => fetchImportLogs(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasProcessing = data.logs.some(
        (log) => log.status === "processing",
      );
      return hasProcessing ? 10_000 : false;
    },
  });
  return query;
}
