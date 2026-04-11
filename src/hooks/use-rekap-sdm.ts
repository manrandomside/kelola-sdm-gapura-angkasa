"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

// ============================================================================
// Types
// ============================================================================
export interface RekapRow {
  namaJabatan: string;
  pegawaiTetap: number;
  pkwt: number;
  tad: number;
  total: number;
}

export interface RekapSummary {
  totalJabatan: number;
  pegawaiTetap: number;
  pkwt: number;
  tad: number;
  grandTotal: number;
}

export interface RekapData {
  rows: RekapRow[];
  summary: RekapSummary;
}

export interface RekapParams {
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
}

// ============================================================================
// Fetchers
// ============================================================================
async function fetchRekapSdm(params: RekapParams): Promise<RekapData> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.order) searchParams.set("order", params.order);
  if (params.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  const url = `/api/rekap-sdm${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as ApiResponse<RekapData>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

async function exportRekapSdm(): Promise<void> {
  const res = await fetch("/api/rekap-sdm/export", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const json = (await res.json()) as ApiResponse<never>;
    if (!json.success) {
      throw new Error(json.error.message);
    }
    throw new Error("Gagal mengexport rekap SDM");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="(.+)"/);
  const fileName = match?.[1] ?? "Rekap_SDM.xlsx";

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

// ============================================================================
// Hooks
// ============================================================================
const STALE_TIME = 30 * 1000;

export function useRekapSdm(params: RekapParams = {}) {
  return useQuery({
    queryKey: ["rekap-sdm", params],
    queryFn: () => fetchRekapSdm(params),
    staleTime: STALE_TIME,
  });
}

export function useExportRekapSdm() {
  return useMutation({
    mutationFn: exportRekapSdm,
  });
}
