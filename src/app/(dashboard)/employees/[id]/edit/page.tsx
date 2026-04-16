"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { EmployeeForm } from "@/components/employees/employee-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  useEmployeeDetail,
  type EmployeeDetail,
} from "@/hooks/use-employee-detail";
import { ROUTES } from "@/lib/constants/routes";
import type { CreateEmployeeInput } from "@/lib/validations/employee";

interface EmployeeEditPageProps {
  params: Promise<{ id: string }>;
}

// Konversi data detail menjadi bentuk yang kompatibel dengan default values
// form. Field null -> string kosong; angka (unit_id/sub_unit_id/height/
// weight/tahun_lulus) dipetakan ke string.
function toFormDefaults(data: EmployeeDetail): Partial<CreateEmployeeInput> {
  const nn = (v: string | null) => v ?? "";
  const ni = (v: number | null) => (v == null ? "" : String(v));

  const jenisKelamin: CreateEmployeeInput["jenis_kelamin"] =
    data.jenis_kelamin === "L" || data.jenis_kelamin === "P"
      ? data.jenis_kelamin
      : "L";

  return {
    nip: data.nip,
    nik: nn(data.nik),
    nama_lengkap: data.nama_lengkap,
    jenis_kelamin: jenisKelamin,
    tempat_lahir: nn(data.tempat_lahir),
    tanggal_lahir: nn(data.tanggal_lahir),
    alamat: nn(data.alamat),
    kota_domisili: nn(data.kota_domisili),
    handphone: nn(data.handphone),
    email: nn(data.email),
    status_pegawai:
      (data.status_pegawai as CreateEmployeeInput["status_pegawai"]) ??
      "PEGAWAI TETAP",
    status_kontrak:
      (data.status_kontrak as CreateEmployeeInput["status_kontrak"]) ?? "",
    status_kerja:
      (data.status_kerja as CreateEmployeeInput["status_kerja"]) ?? "Aktif",
    provider: (data.provider as CreateEmployeeInput["provider"]) ?? "",
    kode_organisasi: nn(data.kode_organisasi),
    unit_organisasi:
      (data.unit_organisasi as CreateEmployeeInput["unit_organisasi"]) ??
      "Airside",
    nama_organisasi: nn(data.nama_organisasi),
    sub_unit_organisasi: nn(data.sub_unit_organisasi),
    unit_id: ni(data.unit_id),
    sub_unit_id: ni(data.sub_unit_id),
    nama_jabatan: data.nama_jabatan ?? "",
    jabatan: nn(data.jabatan),
    kelompok_jabatan:
      (data.kelompok_jabatan as CreateEmployeeInput["kelompok_jabatan"]) ??
      "STAFF",
    kelas_jabatan: nn(data.kelas_jabatan),
    unit_kerja_kontrak: nn(data.unit_kerja_kontrak),
    grade: nn(data.grade),
    kategori_karyawan: nn(data.kategori_karyawan),
    tmt_mulai_kerja: nn(data.tmt_mulai_kerja),
    tmt_berakhir_kerja: nn(data.tmt_berakhir_kerja),
    tmt_mulai_jabatan: nn(data.tmt_mulai_jabatan),
    tmt_akhir_jabatan: nn(data.tmt_akhir_jabatan),
    tmt_berakhir_jabatan: nn(data.tmt_berakhir_jabatan),
    tmt_pensiun: nn(data.tmt_pensiun),
    pendidikan: nn(data.pendidikan),
    pendidikan_terakhir: nn(data.pendidikan_terakhir),
    instansi_pendidikan: nn(data.instansi_pendidikan),
    jurusan: nn(data.jurusan),
    remarks_pendidikan: nn(data.remarks_pendidikan),
    tahun_lulus: ni(data.tahun_lulus),
    no_bpjs_kesehatan: nn(data.no_bpjs_kesehatan),
    no_bpjs_ketenagakerjaan: nn(data.no_bpjs_ketenagakerjaan),
    height: ni(data.height),
    weight: ni(data.weight),
    jenis_sepatu:
      (data.jenis_sepatu as CreateEmployeeInput["jenis_sepatu"]) ?? "",
    ukuran_sepatu:
      (data.ukuran_sepatu as CreateEmployeeInput["ukuran_sepatu"]) ?? "",
    seragam: nn(data.seragam),
  };
}

export default function EmployeeEditPage({ params }: EmployeeEditPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data, isLoading, error } = useEmployeeDetail(id);

  const canEdit = user?.role === "super_admin" || user?.role === "admin";

  // Provider-scoped super admins get their provider auto-filled and locked.
  const lockedProvider =
    user?.role === "super_admin" &&
    user.provider !== null &&
    user.provider !== "PT Gapura Angkasa"
      ? user.provider
      : null;

  const defaults = useMemo(
    () => (data ? toFormDefaults(data) : undefined),
    [data],
  );

  if (isAuthLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
        <h1 className="text-xl font-bold text-destructive">
          Anda tidak memiliki akses
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman ini hanya dapat diakses oleh admin atau super admin.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-11 w-full rounded-lg" />
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !defaults) {
    const code = (error as (Error & { code?: string }) | null)?.code;
    const notFound = code === "NOT_FOUND" || code === "INVALID_ID";
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
        <h1 className="text-xl font-bold text-foreground">
          {notFound
            ? "Data karyawan tidak ditemukan"
            : "Gagal memuat data karyawan"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {notFound
            ? "Karyawan yang Anda cari mungkin sudah dihapus."
            : ((error as Error | null)?.message ??
              "Terjadi kesalahan saat mengambil data.")}
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push(ROUTES.EMPLOYEES)}
        >
          <ArrowLeft className="mr-2 size-4" />
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href={ROUTES.DASHBOARD} className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="size-4" />
        <Link href={ROUTES.EMPLOYEES} className="hover:text-foreground">
          Management Karyawan
        </Link>
        <ChevronRight className="size-4" />
        <Link
          href={ROUTES.EMPLOYEES_DETAIL(data.id)}
          className="hover:text-foreground"
        >
          {data.nama_lengkap}
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">Edit</span>
      </nav>

      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Edit Karyawan
        </h1>
        <p className="text-sm text-muted-foreground">
          Ubah data karyawan pada keempat tab di bawah ini. NIP tidak dapat
          diubah.
        </p>
      </div>

      <EmployeeForm
        mode="edit"
        employeeId={data.id}
        defaultValues={defaults}
        lockedProvider={lockedProvider}
      />
    </div>
  );
}
