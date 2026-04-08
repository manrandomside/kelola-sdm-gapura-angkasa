"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";
import type { UpdateEmployeeInput } from "@/lib/validations/employee";

export interface EmployeeDetail {
  id: number;
  no: number | null;
  nip: string;
  nik: string | null;
  nama_lengkap: string;
  jenis_kelamin: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  usia: number | null;
  alamat: string | null;
  kota_domisili: string | null;
  handphone: string | null;
  email: string | null;
  status_pegawai: string | null;
  status_kontrak: string | null;
  status_kerja: string | null;
  provider: string | null;
  lokasi_kerja: string | null;
  cabang: string | null;
  kode_organisasi: string | null;
  unit_organisasi: string | null;
  nama_organisasi: string | null;
  sub_unit_organisasi: string | null;
  unit_id: number | null;
  sub_unit_id: number | null;
  nama_jabatan: string | null;
  jabatan: string | null;
  kelompok_jabatan: string | null;
  kelas_jabatan: string | null;
  unit_kerja_kontrak: string | null;
  grade: string | null;
  kategori_karyawan: string | null;
  tmt_mulai_kerja: string | null;
  tmt_berakhir_kerja: string | null;
  tmt_mulai_jabatan: string | null;
  tmt_akhir_jabatan: string | null;
  tmt_berakhir_jabatan: string | null;
  tmt_pensiun: string | null;
  masa_kerja: string | null;
  masa_kerja_bulan: string | null;
  masa_kerja_tahun: string | null;
  pendidikan: string | null;
  pendidikan_terakhir: string | null;
  instansi_pendidikan: string | null;
  jurusan: string | null;
  remarks_pendidikan: string | null;
  tahun_lulus: number | null;
  no_bpjs_kesehatan: string | null;
  no_bpjs_ketenagakerjaan: string | null;
  height: number | null;
  weight: number | null;
  jenis_sepatu: string | null;
  ukuran_sepatu: string | null;
  seragam: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeDetailResponse {
  employee: EmployeeDetail;
}

interface UpdatedEmployeeResponse {
  employee: { id: number; nip: string; nama_lengkap: string };
}

export const employeeDetailQueryKey = (id: number | string) =>
  ["employees", "detail", Number(id)] as const;

async function fetchEmployeeDetail(id: number): Promise<EmployeeDetail> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const json = (await res.json()) as ApiResponse<EmployeeDetailResponse>;
  if (!json.success) {
    const err = new Error(json.error.message) as Error & { code?: string };
    err.code = json.error.code;
    throw err;
  }
  return json.data.employee;
}

async function putEmployee(
  id: number,
  payload: UpdateEmployeeInput,
): Promise<UpdatedEmployeeResponse["employee"]> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ApiResponse<UpdatedEmployeeResponse>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data.employee;
}

export function useEmployeeDetail(id: number | string | null) {
  const numericId = id == null ? null : Number(id);
  const enabled = numericId != null && Number.isFinite(numericId) && numericId > 0;

  return useQuery({
    queryKey: enabled
      ? employeeDetailQueryKey(numericId as number)
      : ["employees", "detail", "invalid"],
    queryFn: () => fetchEmployeeDetail(numericId as number),
    enabled,
    staleTime: 30 * 1000,
    retry: (failureCount, error) => {
      const code = (error as Error & { code?: string }).code;
      if (code === "NOT_FOUND" || code === "INVALID_ID") return false;
      return failureCount < 2;
    },
  });
}

export function useUpdateEmployee(id: number | string) {
  const queryClient = useQueryClient();
  const numericId = Number(id);

  return useMutation({
    mutationFn: (payload: UpdateEmployeeInput) => putEmployee(numericId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: employeeDetailQueryKey(numericId),
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

interface DeleteEmployeeResponse {
  message: string;
}

async function deleteEmployeeRequest(id: number): Promise<string> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const json = (await res.json()) as ApiResponse<DeleteEmployeeResponse>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data.message;
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteEmployeeRequest(id),
    onSuccess: (message, id) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.removeQueries({ queryKey: employeeDetailQueryKey(id) });
      toast.success(message || "Data karyawan berhasil dihapus");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal menghapus karyawan";
      toast.error(message);
    },
  });
}
