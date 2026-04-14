"use client";

import { useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

// ============================================================================
// Types
// ============================================================================

export interface TrenBulanan {
  bulan: string;
  label: string;
  shortLabel: string;
  masuk: number;
  keluar: number;
}

export interface PerbandinganPeriode {
  label: string;
  total: number;
  aktif: number;
  nonAktif: number;
  kontrakBerakhir: number;
  karyawanMasuk: number;
}

export interface Perbandingan {
  bulanIni: PerbandinganPeriode;
  bulanLalu: PerbandinganPeriode;
  selisih: {
    total: number;
    aktif: number;
    nonAktif: number;
    kontrakBerakhir: number;
    karyawanMasuk: number;
  };
}

export interface TurnoverProvider {
  provider: string;
  total: number;
  masuk: number;
  keluar: number;
  turnoverRate: number;
}

export interface AnalyticsData {
  trenBulanan: TrenBulanan[];
  perbandingan: Perbandingan;
  turnover: TurnoverProvider[];
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/analytics", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const json = (await res.json()) as ApiResponse<AnalyticsData>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

// ============================================================================
// Hook
// ============================================================================

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    staleTime: 30 * 1000,
  });
}
