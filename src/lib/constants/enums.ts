// Semua nilai enum di bawah ini diambil langsung dari CSV sumber
// "Dashboard Data SDM" — 1414 karyawan, 45 kolom.
// Enum TIDAK didefinisikan sebagai PostgreSQL CREATE TYPE agar import dari
// sistem legacy tetap seamless; validasi dilakukan di level aplikasi (Zod).

// Status pegawai (hanya 2 nilai di CSV)
export const STATUS_PEGAWAI_OPTIONS = [
  "PEGAWAI TETAP",
  "TAD",
] as const;
export type StatusPegawai = (typeof STATUS_PEGAWAI_OPTIONS)[number];

// Status kontrak (FIELD BARU — memecah detail TAD)
// Hubungan: PEGAWAI TETAP -> PEGAWAI TETAP, TAD -> PAKET PEKERJAAN / PAKET SDM / PKWT
export const STATUS_KONTRAK_OPTIONS = [
  "PEGAWAI TETAP",
  "PKWT",
  "PAKET SDM",
  "PAKET PEKERJAAN",
] as const;
export type StatusKontrak = (typeof STATUS_KONTRAK_OPTIONS)[number];

// Status kerja (PERHATIAN: 'Non Aktif' pakai spasi, bukan dash)
export const STATUS_KERJA_OPTIONS = [
  "Aktif",
  "Non Aktif",
  "Pensiun",
  "Mutasi",
] as const;
export type StatusKerja = (typeof STATUS_KERJA_OPTIONS)[number];

// Provider / penyedia tenaga kerja (sesuai CSV, 10 provider)
// Catatan: 'PT Graha Humanindo Manajemen' adalah ejaan Bahasa Indonesia.
export const PROVIDER_OPTIONS = [
  "PT Gapura Angkasa",
  "PT Air Box Personalia",
  "PT Finfleet Teknologi Indonesia",
  "PT Mitra Angkasa Perdana",
  "PT Graha Humanindo Manajemen",
  "PT Mandala Garda Nusantara",
  "PT IAS Support",
  "PT Kidora Mandiri Investama",
  "PT Duta Griya Sarana",
  "PT Aerotrans Wisata",
] as const;
export type Provider = (typeof PROVIDER_OPTIONS)[number];

// Unit organisasi (PERHATIAN: casing TIDAK konsisten di CSV, perlu normalisasi)
// CSV mengandung: 'AIRSIDE', 'Airside', 'LANDSIDE', 'Landside',
// 'BACK OFFICE', 'Back Office', 'Back office'
// Normalisasi ke format Title Case saat import.
export const UNIT_ORGANISASI_OPTIONS = [
  "Airside",
  "Landside",
  "GSE",
  "GH",
  "Back Office",
  "Ancillary",
  "Avsec",
  "EGM",
  "GM",
] as const;
export type UnitOrganisasi = (typeof UNIT_ORGANISASI_OPTIONS)[number];

// Mapping normalisasi unit organisasi dari CSV (case-insensitive lookup)
export const UNIT_ORGANISASI_NORMALIZE: Record<string, UnitOrganisasi> = {
  AIRSIDE: "Airside",
  airside: "Airside",
  Airside: "Airside",
  LANDSIDE: "Landside",
  landside: "Landside",
  Landside: "Landside",
  "BACK OFFICE": "Back Office",
  "back office": "Back Office",
  "Back office": "Back Office",
  "Back Office": "Back Office",
  GSE: "GSE",
  gse: "GSE",
  GH: "GH",
  gh: "GH",
  Ancillary: "Ancillary",
  ANCILLARY: "Ancillary",
  ancillary: "Ancillary",
  Avsec: "Avsec",
  AVSEC: "Avsec",
  avsec: "Avsec",
  EGM: "EGM",
  egm: "EGM",
  GM: "GM",
  gm: "GM",
};

// Kode organisasi -> Nama organisasi mapping (10 kode)
export const KODE_ORGANISASI_MAP = {
  MO: "OPERATION SERVICES",
  ME: "MAINTENANCE SERVICES",
  MF: "FLIGHT SERVICES",
  MS: "MOVEMENT SERVICES",
  MU: "MANAGEMENT UNIT",
  MK: "FINANCE",
  MQ: "QUALITY SERVICES",
  MB: "BUSINESS SERVICES",
  EGM: "EGM",
  GM: "GM",
} as const;
export type KodeOrganisasi = keyof typeof KODE_ORGANISASI_MAP;

// Sub unit organisasi (unique values dari CSV, disimpan sebagai text)
export const SUB_UNIT_ORGANISASI_KNOWN = [
  "BANDAR UDARA NGURAH RAI",
  "APRON",
  "GSE BTT",
  "LOADING MASTER",
  "RAMP",
  "JOUMPA",
  "GSE AC",
  "CARGO INTERNASIONAL",
  "GSE PB",
  "LOAD CONTROL",
  "WORKSHOP GSE MEKANIK",
  "ULD CONTROL",
  "FOO",
  "HR &GA",
  "CREW DESK",
  "DEPCO",
  "Airside Landside",
  "Operation",
  "GAPURA SERVICE",
  "HEADSETMAN",
  "GLC",
  "GAPURA LEARNING CENTRE",
  "Back Office",
  "Kantor Cabang",
] as const;
export type SubUnitOrganisasiKnown =
  (typeof SUB_UNIT_ORGANISASI_KNOWN)[number];

// Kelompok jabatan
// PERHATIAN: 'ACCOUNT EXECUTIVE / AE' menggunakan spasi di sekitar slash,
// simpan persis seperti di CSV.
export const KELOMPOK_JABATAN_OPTIONS = [
  "ACCOUNT EXECUTIVE / AE",
  "EXECUTIVE GENERAL MANAGER",
  "GENERAL MANAGER",
  "MANAGER",
  "STAFF",
  "SUPERVISOR",
  "NON",
] as const;
export type KelompokJabatan = (typeof KELOMPOK_JABATAN_OPTIONS)[number];

// Jenis kelamin
export const JENIS_KELAMIN_OPTIONS = [
  { value: "L", label: "Laki-laki" },
  { value: "P", label: "Perempuan" },
] as const;
export type JenisKelamin = (typeof JENIS_KELAMIN_OPTIONS)[number]["value"];

// Jenis sepatu
export const JENIS_SEPATU_OPTIONS = [
  "Pantofel",
  "Safety Shoes",
] as const;
export type JenisSepatu = (typeof JENIS_SEPATU_OPTIONS)[number];

// Ukuran sepatu
export const UKURAN_SEPATU_OPTIONS = [
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
] as const;
export type UkuranSepatu = (typeof UKURAN_SEPATU_OPTIONS)[number];

// Role pengguna sistem
export const USER_ROLE_OPTIONS = [
  "super_admin",
  "admin",
  "staff",
] as const;
export type UserRole = (typeof USER_ROLE_OPTIONS)[number];

// Tipe aktivitas untuk activity_log
export const ACTIVITY_TYPE_OPTIONS = [
  "login",
  "logout",
  "create_employee",
  "update_employee",
  "delete_employee",
  "import_excel",
  "export_excel",
  "create_user",
  "update_user",
  "delete_user",
  "update_role",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPE_OPTIONS)[number];
