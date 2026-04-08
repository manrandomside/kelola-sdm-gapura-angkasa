"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";
import type { ImportPreviewResult } from "@/lib/utils/excel";

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
