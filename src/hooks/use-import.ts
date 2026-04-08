"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";
import type { ImportPreviewResult, NormalizedRow } from "@/lib/utils/excel";

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
    // Coba parse error JSON.
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
// useImportPreview — upload file ke /api/import/preview, return preview data
// dengan ringkasan validasi.
// ============================================================================
async function uploadPreviewFile(file: File): Promise<ImportPreviewResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/import/preview", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const json = (await res.json()) as ApiResponse<ImportPreviewResult>;
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
// Proses panjang (1414 row ~ 5-15 menit); gunakan timeout fetch default dan
// andalkan maxDuration di route.
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
  return useQuery({
    queryKey: ["import-logs", params],
    queryFn: () => fetchImportLogs(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
