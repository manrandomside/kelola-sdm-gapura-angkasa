"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailRow } from "@/components/shared/detail-row";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useEmployeeDetail } from "@/hooks/use-employee-detail";
import { ROUTES } from "@/lib/constants/routes";

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

const JENIS_KELAMIN_LABEL: Record<string, string> = {
  L: "Laki-laki",
  P: "Perempuan",
};

export default function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, error } = useEmployeeDetail(id);

  const canEdit = user?.role === "super_admin" || user?.role === "admin";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    const code = (error as (Error & { code?: string }) | null)?.code;
    const notFound = code === "NOT_FOUND" || code === "INVALID_ID";
    return (
      <div className="space-y-6">
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
          <span className="text-foreground">Detail</span>
        </nav>
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <h1 className="text-xl font-bold text-foreground">
            {notFound
              ? "Data karyawan tidak ditemukan"
              : "Gagal memuat data karyawan"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {notFound
              ? "Karyawan yang Anda cari mungkin sudah dihapus atau ID tidak valid."
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
      </div>
    );
  }

  const emp = data;

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
        <span className="text-foreground">Detail</span>
      </nav>

      {/* Header Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {emp.nama_lengkap}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                NIP: <span className="font-medium text-foreground">{emp.nip}</span>
              </span>
              {emp.nama_jabatan && (
                <span>
                  Jabatan:{" "}
                  <span className="font-medium text-foreground">
                    {emp.nama_jabatan}
                  </span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <StatusBadge type="status_kerja" value={emp.status_kerja} />
              <StatusBadge type="status_pegawai" value={emp.status_pegawai} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(ROUTES.EMPLOYEES)}
            >
              <ArrowLeft className="mr-2 size-4" />
              Kembali
            </Button>
            {canEdit && (
              <>
                <Button
                  onClick={() => router.push(ROUTES.EMPLOYEES_EDIT(emp.id))}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </Button>
                <Button variant="destructive" disabled>
                  <Trash2 className="mr-2 size-4" />
                  Hapus
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pribadi">
        <TabsList className="h-auto w-full justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="pribadi" className="h-9 px-4">
            Data Pribadi
          </TabsTrigger>
          <TabsTrigger value="kepegawaian" className="h-9 px-4">
            Kepegawaian
          </TabsTrigger>
          <TabsTrigger value="pendidikan" className="h-9 px-4">
            Pendidikan
          </TabsTrigger>
          <TabsTrigger value="administrasi" className="h-9 px-4">
            Administrasi
          </TabsTrigger>
          <TabsTrigger value="fisik" className="h-9 px-4">
            Fisik & Seragam
          </TabsTrigger>
        </TabsList>

        {/* Data Pribadi */}
        <TabsContent value="pribadi" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <DetailRow label="NIK" value={emp.nik} />
              <DetailRow label="Nama Lengkap" value={emp.nama_lengkap} />
              <DetailRow
                label="Jenis Kelamin"
                value={
                  emp.jenis_kelamin
                    ? (JENIS_KELAMIN_LABEL[emp.jenis_kelamin] ??
                      emp.jenis_kelamin)
                    : null
                }
              />
              <DetailRow label="Tempat Lahir" value={emp.tempat_lahir} />
              <DetailRow
                label="Tanggal Lahir"
                value={emp.tanggal_lahir}
                type="date"
              />
              <DetailRow
                label="Usia"
                value={emp.usia != null ? `${emp.usia} tahun` : null}
              />
              <DetailRow
                label="Alamat"
                value={emp.alamat}
                className="md:col-span-2"
              />
              <DetailRow label="Kota Domisili" value={emp.kota_domisili} />
              <DetailRow
                label="Handphone"
                value={emp.handphone}
                type="phone"
              />
              <DetailRow
                label="Email"
                value={emp.email}
                type="email"
                className="md:col-span-2"
              />
            </div>
          </div>
        </TabsContent>

        {/* Kepegawaian */}
        <TabsContent value="kepegawaian" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <DetailRow label="NIP" value={emp.nip} />
              <DetailRow
                label="Status Pegawai"
                value={emp.status_pegawai}
                type="badge"
                badgeType="status_pegawai"
              />
              <DetailRow
                label="Status Kontrak"
                value={emp.status_kontrak}
                type="badge"
                badgeType="status_kontrak"
              />
              <DetailRow
                label="Status Kerja"
                value={emp.status_kerja}
                type="badge"
                badgeType="status_kerja"
              />
              <DetailRow label="Provider" value={emp.provider} />
              <DetailRow label="Lokasi Kerja" value={emp.lokasi_kerja} />
              <DetailRow label="Cabang" value={emp.cabang} />
              <DetailRow label="Kode Organisasi" value={emp.kode_organisasi} />
              <DetailRow label="Unit Organisasi" value={emp.unit_organisasi} />
              <DetailRow
                label="Nama Organisasi"
                value={emp.nama_organisasi}
                className="md:col-span-2"
              />
              <DetailRow
                label="Sub Unit Organisasi"
                value={emp.sub_unit_organisasi}
                className="md:col-span-2"
              />
              <DetailRow label="Nama Jabatan" value={emp.nama_jabatan} />
              <DetailRow label="Jabatan" value={emp.jabatan} />
              <DetailRow
                label="Kelompok Jabatan"
                value={emp.kelompok_jabatan}
              />
              <DetailRow label="Kelas Jabatan" value={emp.kelas_jabatan} />
              <DetailRow
                label="Unit Kerja Kontrak"
                value={emp.unit_kerja_kontrak}
                className="md:col-span-2"
              />
              <DetailRow label="Grade" value={emp.grade} />
              <DetailRow
                label="Kategori Karyawan"
                value={emp.kategori_karyawan}
              />
              <DetailRow
                label="TMT Mulai Kerja"
                value={emp.tmt_mulai_kerja}
                type="date"
              />
              <DetailRow
                label="TMT Berakhir Kerja"
                value={emp.tmt_berakhir_kerja}
                type="date"
              />
              <DetailRow
                label="TMT Mulai Jabatan"
                value={emp.tmt_mulai_jabatan}
                type="date"
              />
              <DetailRow
                label="TMT Akhir Jabatan"
                value={emp.tmt_akhir_jabatan}
                type="date"
              />
              <DetailRow
                label="TMT Berakhir Jabatan"
                value={emp.tmt_berakhir_jabatan}
                type="date"
              />
              <DetailRow
                label="TMT Pensiun"
                value={emp.tmt_pensiun}
                type="date"
              />
              <DetailRow label="Masa Kerja" value={emp.masa_kerja} />
              <DetailRow
                label="Masa Kerja (Tahun)"
                value={emp.masa_kerja_tahun}
              />
              <DetailRow
                label="Masa Kerja (Bulan)"
                value={emp.masa_kerja_bulan}
              />
            </div>
          </div>
        </TabsContent>

        {/* Pendidikan */}
        <TabsContent value="pendidikan" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <DetailRow label="Pendidikan" value={emp.pendidikan} />
              <DetailRow
                label="Pendidikan Terakhir"
                value={emp.pendidikan_terakhir}
              />
              <DetailRow
                label="Instansi Pendidikan"
                value={emp.instansi_pendidikan}
                className="md:col-span-2"
              />
              <DetailRow label="Jurusan" value={emp.jurusan} />
              <DetailRow label="Tahun Lulus" value={emp.tahun_lulus} />
              <DetailRow
                label="Remarks Pendidikan"
                value={emp.remarks_pendidikan}
                className="md:col-span-2"
              />
            </div>
          </div>
        </TabsContent>

        {/* Administrasi */}
        <TabsContent value="administrasi" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <DetailRow
                label="No BPJS Kesehatan"
                value={emp.no_bpjs_kesehatan}
              />
              <DetailRow
                label="No BPJS Ketenagakerjaan"
                value={emp.no_bpjs_ketenagakerjaan}
              />
            </div>
          </div>
        </TabsContent>

        {/* Fisik & Seragam */}
        <TabsContent value="fisik" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <DetailRow
                label="Tinggi Badan"
                value={emp.height != null ? `${emp.height} cm` : null}
              />
              <DetailRow
                label="Berat Badan"
                value={emp.weight != null ? `${emp.weight} kg` : null}
              />
              <DetailRow label="Jenis Sepatu" value={emp.jenis_sepatu} />
              <DetailRow label="Ukuran Sepatu" value={emp.ukuran_sepatu} />
              <DetailRow
                label="Seragam"
                value={emp.seragam}
                className="md:col-span-2"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
