"use client";

import { useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

// ============================================================================
// Types
// ============================================================================
export interface NonAktifEmployee {
  id: number;
  nip: string;
  namaLengkap: string;
  namaJabatan: string | null;
  unitOrganisasi: string | null;
  provider: string | null;
  statusKerja: string | null;
  tmtBerakhirKerja: string | null;
  tmtPensiun: string | null;
}

export interface NonAktifGroup {
  count: number;
  employees: NonAktifEmployee[];
}

export interface NonAktifDetailData {
  kontrakHabis: NonAktifGroup;
  pensiun: NonAktifGroup;
  nonAktifManual: NonAktifGroup;
  totalNonAktif: number;
}

// ============================================================================
// Fetcher
// ============================================================================
async function fetchNonAktifDetail(): Promise<NonAktifDetailData> {
  const res = await fetch("/api/employees/non-aktif-detail", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as ApiResponse<NonAktifDetailData>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

// ============================================================================
// Hook
// ============================================================================
export function useNonAktifDetail() {
  return useQuery({
    queryKey: ["non-aktif-detail"],
    queryFn: fetchNonAktifDetail,
    staleTime: 30 * 1000,
  });
}
