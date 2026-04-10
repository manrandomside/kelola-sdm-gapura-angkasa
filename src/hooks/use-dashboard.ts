"use client";

import { useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

// ============================================================================
// Types
// ============================================================================
export interface DashboardStatistics {
  total: number;
  pegawaiTetap: number;
  pkwt: number;
  tad: number;
  tadPaketPekerjaan: number;
  tadPaketSdm: number;
  aktif: number;
  nonAktif: number;
  pensiun: number;
  mutasi: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface DashboardCharts {
  statusKontrak: ChartDataPoint[];
  unitOrganisasi: ChartDataPoint[];
  provider: ChartDataPoint[];
}

export interface RecentActivity {
  id: string;
  user_id: string | null;
  user_name: string | null;
  activity: string;
  description: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  created_at: string;
}

interface RecentActivitiesData {
  activities: RecentActivity[];
}

// ============================================================================
// Fetchers
// ============================================================================
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

// ============================================================================
// Hooks
// ============================================================================
const STALE_TIME = 30 * 1000;

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "statistics"],
    queryFn: () => fetchJson<DashboardStatistics>("/api/dashboard/statistics"),
    staleTime: STALE_TIME,
  });
}

export function useDashboardCharts() {
  return useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: () => fetchJson<DashboardCharts>("/api/dashboard/charts"),
    staleTime: STALE_TIME,
  });
}

export function useDashboardActivities() {
  return useQuery({
    queryKey: ["dashboard", "activities"],
    queryFn: () => fetchJson<RecentActivitiesData>("/api/dashboard/activities"),
    staleTime: STALE_TIME,
  });
}
