"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

export interface ExportFilter {
  search?: string | null;
  status_pegawai?: string | null;
  status_kontrak?: string | null;
  unit_organisasi?: string | null;
  provider?: string | null;
  status_kerja?: string | null;
}

export type ExportColumnSet = "all" | "basic";

export interface CustomExportFilters {
  statusKerja?: string;
  statusPegawai?: string;
  provider?: string;
  unitOrganisasi?: string;
  tmtBerakhirFrom?: string;
  tmtBerakhirTo?: string;
}

export interface ExportPayload {
  filter?: ExportFilter;
  columns?: ExportColumnSet;
  selectedIds?: number[];
  mode?: "all" | "selected" | "custom";
  customFilters?: CustomExportFilters;
}

export interface ExportPreviewPayload {
  mode: "all" | "selected" | "custom";
  selectedIds?: number[];
  filters?: CustomExportFilters;
  currentFilters?: ExportFilter;
}

interface PreviewResponse {
  count: number;
}

// Extract filename dari header Content-Disposition. Fallback ke nama default
// jika tidak ditemukan.
function parseFilename(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename="?([^";]+)"?/.exec(header);
  return match?.[1] ?? fallback;
}

async function postExport(payload: ExportPayload): Promise<void> {
  const res = await fetch("/api/export", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Response mungkin JSON error envelope jika gagal auth / server.
    try {
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!json.success) throw new Error(json.error.message);
    } catch (err) {
      if (err instanceof Error && err.message) throw err;
    }
    throw new Error("Gagal mengexport data karyawan");
  }

  const blob = await res.blob();
  const fileName = parseFilename(
    res.headers.get("Content-Disposition"),
    "SDM_GapuraAngkasa.xlsx",
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function postExportPreview(
  payload: ExportPreviewPayload,
): Promise<PreviewResponse> {
  const res = await fetch("/api/export/preview", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Gagal menghitung preview");
  }

  const json = (await res.json()) as ApiResponse<PreviewResponse>;
  if (!json.success) {
    throw new Error("Gagal menghitung preview");
  }
  return json.data;
}

export function useExportExcel() {
  return useMutation({
    mutationFn: (payload: ExportPayload) => postExport(payload),
    onSuccess: () => {
      toast.success("File berhasil diunduh");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal mengexport data";
      toast.error(message);
    },
  });
}

export function useExportPreview() {
  return useMutation({
    mutationFn: (payload: ExportPreviewPayload) => postExportPreview(payload),
  });
}
