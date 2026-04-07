import type {
  JenisKelamin,
  JenisSepatu,
  KelompokJabatan,
  KodeOrganisasi,
  Provider,
  StatusKerja,
  StatusKontrak,
  StatusPegawai,
  UkuranSepatu,
  UnitOrganisasi,
} from "@/lib/constants/enums";

// Flat employee record (mirrors the `employee` table in the database).
// All 45+ fields live in a single table — no child tables for family,
// education, or job history.
export interface Employee {
  id: number;

  // Nomor urut & identitas
  no: number | null;
  nip: string;
  nik: string | null;

  // Data pribadi
  nama_lengkap: string;
  jenis_kelamin: JenisKelamin | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  usia: number | null;
  alamat: string | null;
  kota_domisili: string | null;
  handphone: string | null;
  email: string | null;

  // Data kepegawaian
  status_pegawai: StatusPegawai | null;
  status_kontrak: StatusKontrak | null;
  status_kerja: StatusKerja | null;
  provider: Provider | null;
  lokasi_kerja: string | null;
  cabang: string | null;

  // Organisasi & jabatan
  kode_organisasi: KodeOrganisasi | null;
  unit_organisasi: UnitOrganisasi | null;
  nama_organisasi: string | null;
  sub_unit_organisasi: string | null;
  unit_id: number | null;
  sub_unit_id: number | null;
  nama_jabatan: string | null;
  jabatan: string | null;
  kelompok_jabatan: KelompokJabatan | null;
  kelas_jabatan: string | null;
  unit_kerja_kontrak: string | null;
  grade: string | null;
  kategori_karyawan: string | null;

  // Tanggal-tanggal kepegawaian (TMT = Terhitung Mulai Tanggal)
  tmt_mulai_kerja: string | null;
  tmt_berakhir_kerja: string | null;
  tmt_mulai_jabatan: string | null;
  tmt_akhir_jabatan: string | null;
  tmt_berakhir_jabatan: string | null;
  tmt_pensiun: string | null;
  masa_kerja: string | null;
  masa_kerja_bulan: string | null;
  masa_kerja_tahun: string | null;

  // Pendidikan
  pendidikan: string | null;
  pendidikan_terakhir: string | null;
  instansi_pendidikan: string | null;
  jurusan: string | null;
  remarks_pendidikan: string | null;
  tahun_lulus: number | null;

  // Administrasi
  no_bpjs_kesehatan: string | null;
  no_bpjs_ketenagakerjaan: string | null;

  // Fisik & seragam
  height: number | null;
  weight: number | null;
  jenis_sepatu: JenisSepatu | null;
  ukuran_sepatu: UkuranSepatu | null;
  seragam: string | null;

  // Relasi & status record
  organization_id: number | null;
  status: string;

  created_at: string;
  updated_at: string;
}

// Payload untuk POST /api/employees. NIP + nama_lengkap wajib;
// field lain opsional sesuai realita data legacy.
export type CreateEmployeeInput = Pick<
  Employee,
  "nip" | "nama_lengkap"
> &
  Partial<Omit<Employee, "id" | "nip" | "nama_lengkap" | "created_at" | "updated_at">>;

// Payload untuk PUT /api/employees/[id]. Semua field opsional.
export type UpdateEmployeeInput = Partial<
  Omit<Employee, "id" | "created_at" | "updated_at">
>;
