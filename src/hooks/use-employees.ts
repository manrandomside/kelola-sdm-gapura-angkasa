"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

export interface EmployeeListItem {
  id: number;
  no: number | null;
  nip: string;
  nik: string | null;
  nama_lengkap: string;
  jenis_kelamin: string | null;
  unit_organisasi: string | null;
  nama_jabatan: string | null;
  status_pegawai: string | null;
  status_kontrak: string | null;
  status_kerja: string | null;
  provider: string | null;
  cabang: string | null;
}

export interface EmployeeListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmployeeListStatistics {
  total: number;
  pegawaiTetap: number;
  pkwt: number;
  tad: number;
  aktif: number;
  nonAktif: number;
}

export interface EmployeeListData {
  employees: EmployeeListItem[];
  pagination: EmployeeListPagination;
  statistics: EmployeeListStatistics;
}

export interface UseEmployeesParams {
  page: number;
  limit: number;
  search: string;
  status_pegawai: string | null;
  status_kontrak: string | null;
  unit_organisasi: string | null;
  provider: string | null;
  status_kerja: string | null;
  sort: string;
  order: "asc" | "desc";
}

function buildQueryString(params: UseEmployeesParams): string {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  if (params.search) sp.set("search", params.search);
  if (params.status_pegawai) sp.set("status_pegawai", params.status_pegawai);
  if (params.status_kontrak) sp.set("status_kontrak", params.status_kontrak);
  if (params.unit_organisasi) sp.set("unit_organisasi", params.unit_organisasi);
  if (params.provider) sp.set("provider", params.provider);
  if (params.status_kerja) sp.set("status_kerja", params.status_kerja);
  sp.set("sort", params.sort);
  sp.set("order", params.order);
  return sp.toString();
}

async function fetchEmployees(
  params: UseEmployeesParams,
): Promise<EmployeeListData> {
  const qs = buildQueryString(params);
  const res = await fetch(`/api/employees?${qs}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const json = (await res.json()) as ApiResponse<EmployeeListData>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export function useEmployees(params: UseEmployeesParams) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: () => fetchEmployees(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
