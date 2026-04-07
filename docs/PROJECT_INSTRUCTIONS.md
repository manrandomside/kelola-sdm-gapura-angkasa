# PROJECT SPECIFICATION DOCUMENT
# Kelola SDM Gapura Angkasa — Sistem Manajemen Data SDM
> **Versi**: 1.2 (Revised — NIP-based Auth, Flat Structure, CSV-validated 1414 records)
> **Tanggal**: 6 April 2026
> **Status**: Planning & Migration Phase
> **Nama Project**: Kelola SDM Gapura Angkasa
> **Perusahaan**: PT Gapura Angkasa (Ground Handling — Bandar Udara I Gusti Ngurah Rai, Bali)
> **Timezone**: Asia/Makassar (WITA / UTC+8)

---

## DAFTAR ISI

- [A. Konsep dan Tujuan Project](#a-konsep-dan-tujuan-project)
- [B. Tech Stack](#b-tech-stack)
- [C. Struktur Database](#c-struktur-database)
- [D. Fitur & User Flow](#d-fitur--user-flow)
- [E. API Endpoints](#e-api-endpoints)
- [F. UI/UX & Design System](#f-uiux--design-system)
- [G. Aturan Coding](#g-aturan-coding)

---

# A. KONSEP DAN TUJUAN PROJECT

## Nama Project

**Kelola SDM Gapura Angkasa** — Sistem Manajemen Sumber Daya Manusia internal PT Gapura Angkasa, perusahaan ground handling yang beroperasi di Bandar Udara I Gusti Ngurah Rai, Bali.

## Deskripsi Project

Kelola SDM Gapura Angkasa adalah aplikasi web internal perusahaan yang berfungsi sebagai pusat pengelolaan seluruh data karyawan. Aplikasi ini mencakup data pribadi, data kepegawaian, data keluarga, riwayat pendidikan, riwayat jabatan/mutasi, data kontrak, dokumen-dokumen, serta statistik dan laporan terkait SDM. Dengan jumlah karyawan 500+ record dan terus bertambah, sistem ini dirancang untuk mendukung operasional HR secara efisien melalui fitur pencarian, filter, sorting, import/export Excel, dan dashboard statistik real-time.

Aplikasi ini dimigrasi dari stack Laravel + MySQL ke Next.js 15 (App Router) + Supabase untuk mendapatkan developer experience yang lebih modern, performa yang lebih baik, dan arsitektur yang lebih scalable.

## Tujuan Utama

1. **Operasional**: Menjadi satu-satunya sumber kebenaran (single source of truth) untuk seluruh data SDM PT Gapura Angkasa di Bandar Udara Ngurah Rai
2. **Efisiensi**: Mempercepat proses pengelolaan data karyawan melalui fitur import/export Excel, pencarian cepat, dan filter multi-kriteria
3. **Keamanan**: Mengamankan data sensitif karyawan melalui autentikasi, role-based access control, dan Row Level Security di level database
4. **Pelaporan**: Menyediakan dashboard statistik dan laporan yang dapat diekspor untuk kebutuhan manajemen
5. **Portofolio**: Mendemonstrasikan kemampuan fullstack development dengan tech stack modern dan arsitektur production-grade

## Fitur Utama

### Fitur Inti (MVP)

| No | Fitur | Deskripsi |
|----|-------|-----------|
| 1 | **Autentikasi & Role** | Login via NIP + password. Password default = NIP karyawan (contoh: NIP `2160791` maka password `2160791`). 3 role: Super Admin (full access + user management), Admin (CRUD karyawan), Staff (read-only). Akun dibuat otomatis saat import data SDM — setiap karyawan yang di-import langsung mendapat akun login. Tidak ada Google OAuth atau provider eksternal |
| 2 | **Dashboard Statistik** | Ringkasan total karyawan, distribusi per unit kerja/jabatan/status pegawai/provider, chart interaktif (bar, donut), quick actions, aktivitas terbaru |
| 3 | **CRUD Karyawan** | Create, Read, Update, Delete data karyawan dengan form multi-section (data pribadi, kepegawaian, pendidikan, data tambahan). Cascading dropdown untuk unit organisasi. Validasi ketat di frontend dan backend |
| 4 | **Import Excel/CSV** | FITUR KRITIS. Upload file .xlsx/.csv untuk bulk import data karyawan. Validasi per-row, preview sebelum import, error report detail. Setiap karyawan yang berhasil di-import otomatis mendapat akun login (NIP = password). Data harus tampil SEMPURNA tanpa ada yang hilang |
| 5 | **Export Excel** | Export data karyawan ke .xlsx dengan filter (semua/per unit/per status). Format profesional dengan header styling. Kolom sesuai kebutuhan laporan HR |
| 6 | **Search & Filter** | Pencarian global (nama, NIP, NIK), filter multi-kriteria (unit kerja, jabatan, status pegawai, provider, status kerja, kelompok jabatan), sorting per kolom, pagination server-side |
| 7 | **Detail Karyawan** | Halaman profil lengkap per karyawan dengan semua data terstruktur dalam tab/section: pribadi, kepegawaian, pendidikan, administrasi, fisik & seragam |
| 8 | **Manajemen User** | Super Admin dapat mengelola akun: create manual, edit role (super_admin/admin/staff), deactivate, reset password ke NIP |
| 9 | **Activity Log** | Pencatatan setiap aksi (create, update, delete, import, export, login) dengan timestamp WITA, user, dan detail perubahan |

### Fitur Tambahan (Post-MVP)

| No | Fitur | Deskripsi |
|----|-------|-----------|
| 10 | **Notifikasi Kontrak** | Alert otomatis untuk kontrak karyawan (PKWT/TAD) yang akan berakhir dalam 30/60/90 hari berdasarkan tmt_berakhir_kerja |
| 11 | **Cetak Profil** | Generate PDF profil karyawan untuk keperluan administrasi |
| 12 | **Ubah Password** | User bisa mengubah password sendiri setelah login pertama (dari default NIP ke password custom) |
| 13 | **Data Keluarga** | Tabel terpisah untuk data pasangan dan anak (post-MVP, saat ini belum ada) |
| 14 | **Upload Dokumen** | Upload foto karyawan + dokumen pendukung KTP, ijazah, SK, dll (post-MVP) |
| 15 | **Multi-Lokasi** | Dukungan untuk cabang Gapura Angkasa di bandara lain |

## Hal yang Perlu Dipertimbangkan

### Teknis

- **Supabase Free Tier Pause**: Project di-pause setelah 7 hari tidak aktif. Setup GitHub Actions cron job untuk ping harian agar database tetap aktif
- **File Storage**: Foto + dokumen karyawan bisa mencapai ratusan MB. Gunakan Supabase Storage (1GB free tier) dengan kompresi gambar dan pembatasan ukuran file (max 5MB per file)
- **Import Excel Performance**: File Excel bisa berisi ratusan row. Proses import harus asynchronous dengan progress indicator, validasi per-row, dan error handling yang jelas
- **Search Performance**: Dengan 500+ karyawan dan field yang banyak, perlu full-text search index di PostgreSQL untuk pencarian cepat
- **Data Sensitivity**: Data karyawan termasuk NIK, NPWP, BPJS adalah data sensitif. RLS di Supabase wajib diaktifkan, dan data harus di-encrypt saat transit (HTTPS)
- **Timezone Consistency**: Semua timestamp harus konsisten menggunakan Asia/Makassar (WITA). Simpan di database sebagai TIMESTAMPTZ, konversi di frontend
- **Concurrent Editing**: Dua admin bisa mengedit karyawan yang sama secara bersamaan. Implementasi optimistic locking via `updated_at` check

### UX

- **Form Panjang**: Form karyawan memiliki 50+ field. Pecah menjadi section/tab (Data Pribadi, Kepegawaian, Keluarga, Pendidikan, Jabatan, Dokumen) dengan save per-section atau save all
- **Import UX**: User harus bisa download template Excel, lihat preview data sebelum import, dan dapat laporan error yang jelas per row
- **Mobile Responsif**: Meskipun mayoritas diakses via desktop di kantor, harus tetap responsif untuk tablet dan mobile
- **Loading State**: Setiap operasi (fetch, save, import, export) harus memiliki loading indicator yang jelas
- **Bahasa**: Seluruh interface dalam Bahasa Indonesia

### Legal & Keamanan

- **UU PDP (Perlindungan Data Pribadi)**: Data karyawan termasuk data pribadi yang dilindungi UU PDP Indonesia. Pastikan akses terbatas dan ada log audit
- **Retensi Data**: Tentukan kebijakan retensi data — berapa lama data karyawan yang sudah keluar disimpan
- **Backup**: Data karyawan harus memiliki mekanisme backup reguler

---

# B. TECH STACK

## Arsitektur Utama

```
+----------------------------------------------------------+
|                    CLIENT (Browser)                       |
|  Next.js 15 (App Router) + React 19 + TypeScript 5       |
|  Tailwind CSS 4 + shadcn/ui + Framer Motion              |
|  Zustand (client state) + TanStack Query v5 (server)     |
|  SheetJS (import/export Excel) + Recharts (charts)        |
+----------------------------------------------------------+
                            |
                     HTTPS / Fetch
                            |
+----------------------------------------------------------+
|               SERVER (Vercel Edge/Node)                   |
|  Next.js API Routes + Server Actions + Server Components  |
|  Drizzle ORM (type-safe SQL) + Zod (validation)          |
|  Supabase JS Client (auth + storage + realtime)           |
+----------------------------------------------------------+
                            |
                   Supabase Client SDK
                            |
+----------------------------------------------------------+
|              BACKEND SERVICES (Supabase)                  |
|  PostgreSQL (500MB) + Auth (50K MAU) + Storage (1GB)      |
|  Row Level Security + Realtime Subscriptions              |
+----------------------------------------------------------+
                            |
+----------------------------------------------------------+
|                 DEPLOYMENT & CI/CD                        |
|  Vercel (Hosting + CDN + Serverless Functions)            |
|  GitHub Actions (CI + Supabase keep-alive cron)           |
+----------------------------------------------------------+
```

## Detail Tech Stack

### Frontend

| Teknologi | Versi | Fungsi | Justifikasi |
|-----------|-------|--------|-------------|
| **Next.js** | 15 (App Router) | Framework fullstack | RSC, Server Actions, streaming, built-in optimization. Ekosistem React terbesar |
| **React** | 19 | UI library | Server Components, Suspense, transitions. Standar industri |
| **TypeScript** | 5.x | Type safety | Mengurangi bug, autocomplete IDE, dokumentasi otomatis. Krusial untuk project dengan banyak field data |
| **Tailwind CSS** | 4 | Utility-first CSS | Rapid prototyping, konsisten, tree-shaking otomatis |
| **shadcn/ui** | Latest | Component library | Accessible, customizable, copy-paste. Table, Dialog, Form, Select, DatePicker yang mature |
| **Framer Motion** | 12.x | Micro-interactions | Page transitions, modal animations, hover effects. Membuat UI terasa responsif dan profesional |
| **Zustand** | 5.x | Client state | Ringan (~3KB), tanpa Provider wrapper. Untuk UI state seperti sidebar, modal, filter state |
| **TanStack Query** | 5.x | Server state | Caching, background refetch, pagination, optimistic updates. Krusial untuk data 500+ karyawan |
| **Recharts** | 2.x | Charts | Bar chart, donut chart, line chart untuk dashboard statistik. Composable, responsif |
| **SheetJS (xlsx)** | Latest | Excel processing | Import/export .xlsx. Library paling mature untuk Excel di JavaScript |
| **Lucide React** | Latest | Icons | Konsisten, tree-shakeable, 1500+ ikon |
| **date-fns** | 3.x | Date formatting | Lightweight, immutable, mendukung locale Indonesia |
| **react-dropzone** | Latest | File upload | Drag & drop file upload untuk dokumen dan foto |

### Backend & Database

| Teknologi | Versi | Fungsi | Justifikasi |
|-----------|-------|--------|-------------|
| **Supabase** | Latest | Backend-as-a-Service | PostgreSQL + Auth + Storage + RLS dalam 1 free tier. Mengeliminasi kebutuhan 3-4 layanan terpisah |
| **Drizzle ORM** | Latest | ORM | Type-safe, SQL-like syntax, edge-compatible, migrasi otomatis. Lebih ringan dari Prisma |
| **Zod** | 3.x | Schema validation | Runtime + compile-time validation untuk form, API payload, environment variables. Krusial untuk validasi 50+ field karyawan |

### Deployment & DevTools

| Teknologi | Fungsi | Free Tier |
|-----------|--------|-----------|
| **Vercel** | Hosting + CDN + serverless functions | 100GB BW, 6000 build min/mo |
| **GitHub** | Version control + CI/CD | Unlimited repos |
| **GitHub Actions** | CI pipeline + Supabase keep-alive cron | 2.000 min/mo |
| **ESLint** | Linting | Gratis |
| **Prettier** | Code formatting | Gratis |

### Kenapa BUKAN Alternatif Lain?

| Dipertimbangkan | Ditolak Karena |
|----------------|----------------|
| Laravel (stack lama) | Ingin migrasi ke ekosistem JavaScript/TypeScript penuh untuk DX yang lebih baik dan type-safety end-to-end |
| Prisma | Binary engine ~15MB, cold start lambat di serverless. Drizzle lebih ringan dan edge-compatible |
| MongoDB | Document model kurang cocok untuk data relasional HR yang sangat terstruktur (karyawan > keluarga > pendidikan > jabatan). SQL joins lebih efisien |
| Firebase | Firestore pricing per read/write bisa mahal untuk operasi batch (import 500 row). Supabase unlimited reads |
| MySQL (stack lama) | PostgreSQL di Supabase lebih fitur (full-text search, JSONB, array types, RLS). Free tier lebih generous |
| Clerk Auth | Free tier hanya 10K MAU vs Supabase 50K MAU. Menambah dependency terpisah padahal Supabase sudah all-in-one |
| AG Grid / TanStack Table | shadcn/ui DataTable sudah cukup untuk kebutuhan tabel 500 row dengan server-side pagination |
| ExcelJS | SheetJS (xlsx) lebih ringan, lebih mature, dan lebih banyak digunakan di ekosistem frontend |

---

# C. STRUKTUR DATABASE

## Entity Relationship Diagram (Konseptual)

```
+----------+       +------------+       +----------+
|   user   |------>| employee   |<------| unit     |
| (login)  |       | (karyawan) |       +----------+
+----+-----+       +-----+------+            |
     |                    |             +----------+
     |                    |             | sub_unit |
     |                    |             +----------+
     |         (references)
     |                    |
+----+-----+       +-----+------+
|activity  |       |organization|
|  _log    |       |(unit kerja)|
+----------+       +------------+
                         |
                   +----------+
                   |import_log|
                   +----------+
```

**Catatan**: Data karyawan menggunakan struktur flat (semua field dalam satu tabel `employee`). Tidak ada tabel terpisah untuk keluarga, pendidikan, riwayat jabatan, kontrak, atau dokumen. Ini mengikuti struktur project Laravel yang sudah berjalan agar import CSV/Excel bisa seamless.

## Enum Types (sebagai Konstanta Aplikasi)

Enum ini TIDAK dibuat sebagai PostgreSQL CREATE TYPE, melainkan sebagai konstanta TypeScript di aplikasi dan validasi Zod. Ini mengikuti pola project Laravel yang menggunakan string biasa di database dengan validasi di level aplikasi.

```typescript
// lib/constants/enums.ts
// SEMUA NILAI DI BAWAH INI DIAMBIL LANGSUNG DARI CSV "Dashboard Data SDM DATABASE SDM"
// Total data CSV: 1414 karyawan, 45 kolom

// Status pegawai (hanya 2 nilai di CSV)
export const STATUS_PEGAWAI_OPTIONS = [
  'PEGAWAI TETAP',
  'TAD',
] as const;

// Status kontrak (FIELD BARU - memecah detail TAD)
// Hubungan: PEGAWAI TETAP -> PEGAWAI TETAP, TAD -> PAKET PEKERJAAN/PAKET SDM/PKWT
export const STATUS_KONTRAK_OPTIONS = [
  'PEGAWAI TETAP',
  'PKWT',
  'PAKET SDM',
  'PAKET PEKERJAAN',
] as const;

// Status kerja (PERHATIAN: 'Non Aktif' pakai spasi, bukan dash)
export const STATUS_KERJA_OPTIONS = [
  'Aktif',
  'Non Aktif',
  'Pensiun',
  'Mutasi',
] as const;

// Provider / penyedia tenaga kerja (sesuai CSV, 10 provider)
export const PROVIDER_OPTIONS = [
  'PT Gapura Angkasa',
  'PT Air Box Personalia',
  'PT Finfleet Teknologi Indonesia',
  'PT Mitra Angkasa Perdana',
  'PT Graha Humanindo Manajemen',
  'PT Mandala Garda Nusantara',
  'PT IAS Support',
  'PT Kidora Mandiri Investama',
  'PT Duta Griya Sarana',
  'PT Aerotrans Wisata',
] as const;

// Unit organisasi (PERHATIAN: casing TIDAK konsisten di CSV, perlu normalisasi saat import)
// CSV mengandung: 'AIRSIDE', 'Airside', 'LANDSIDE', 'Landside', 'BACK OFFICE', 'Back Office', 'Back office'
// Normalisasi ke format Title Case saat import
export const UNIT_ORGANISASI_OPTIONS = [
  'Airside',
  'Landside',
  'GSE',
  'GH',
  'Back Office',
  'Ancillary',
  'Avsec',
  'EGM',
  'GM',
] as const;

// Mapping normalisasi unit organisasi dari CSV (case-insensitive)
export const UNIT_ORGANISASI_NORMALIZE: Record<string, string> = {
  'AIRSIDE': 'Airside',
  'airside': 'Airside',
  'LANDSIDE': 'Landside',
  'landside': 'Landside',
  'BACK OFFICE': 'Back Office',
  'back office': 'Back Office',
  'Back office': 'Back Office',
  'GSE': 'GSE',
  'GH': 'GH',
  'Ancillary': 'Ancillary',
  'ANCILLARY': 'Ancillary',
  'Avsec': 'Avsec',
  'AVSEC': 'Avsec',
  'EGM': 'EGM',
  'GM': 'GM',
};

// Kode organisasi -> Nama organisasi mapping
export const KODE_ORGANISASI_MAP = {
  'MO': 'OPERATION SERVICES',
  'ME': 'MAINTENANCE SERVICES',
  'MF': 'FLIGHT SERVICES',
  'MS': 'MOVEMENT SERVICES',
  'MU': 'MANAGEMENT UNIT',
  'MK': 'FINANCE',
  'MQ': 'QUALITY SERVICES',
  'MB': 'BUSINESS SERVICES',
  'EGM': 'EGM',
  'GM': 'GM',
} as const;

// Sub unit organisasi (27 unique values dari CSV, disimpan sebagai text)
export const SUB_UNIT_ORGANISASI_KNOWN = [
  'BANDAR UDARA NGURAH RAI',
  'APRON',
  'GSE BTT',
  'LOADING MASTER',
  'RAMP',
  'JOUMPA',
  'GSE AC',
  'CARGO INTERNASIONAL',
  'GSE PB',
  'LOAD CONTROL',
  'WORKSHOP GSE MEKANIK',
  'ULD CONTROL',
  'FOO',
  'HR &GA',
  'CREW DESK',
  'DEPCO',
  'Airside Landside',
  'Operation',
  'GAPURA SERVICE',
  'HEADSETMAN',
  'GLC',
  'GAPURA LEARNING CENTRE',
  'Back Office',
  'Kantor Cabang',
] as const;

// Kelompok jabatan (PERHATIAN: spasi di sekitar slash berbeda di CSV)
// CSV: 'ACCOUNT EXECUTIVE / AE' (dengan spasi)
export const KELOMPOK_JABATAN_OPTIONS = [
  'ACCOUNT EXECUTIVE / AE',
  'EXECUTIVE GENERAL MANAGER',
  'GENERAL MANAGER',
  'MANAGER',
  'STAFF',
  'SUPERVISOR',
  'NON',
] as const;

// Jenis kelamin
export const JENIS_KELAMIN_OPTIONS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
] as const;

// Jenis sepatu
export const JENIS_SEPATU_OPTIONS = [
  'Pantofel',
  'Safety Shoes',
] as const;

// Ukuran sepatu
export const UKURAN_SEPATU_OPTIONS = [
  '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46',
] as const;

// Role pengguna
export const USER_ROLE_OPTIONS = [
  'super_admin',
  'admin',
  'staff',
] as const;

// Tipe aktivitas untuk log
export const ACTIVITY_TYPE_OPTIONS = [
  'login',
  'logout',
  'create_employee',
  'update_employee',
  'delete_employee',
  'import_excel',
  'export_excel',
  'create_user',
  'update_user',
  'delete_user',
  'update_role',
] as const;
```

### Catatan Penting dari Analisis CSV

**Data Overview:**
- Total: 1414 karyawan, 45 kolom
- PEGAWAI TETAP: 202 orang (14%)
- TAD PAKET PEKERJAAN: 1017 orang (72%)
- TAD PKWT: 139 orang (10%)
- TAD PAKET SDM: 56 orang (4%)

**Inkonsistensi yang HARUS di-handle saat import:**
1. `unit_organisasi` memiliki casing tidak konsisten ('AIRSIDE' vs 'Airside' vs 'BACK OFFICE' vs 'Back Office'). Normalisasi ke Title Case
2. `status_kerja` menggunakan 'Non Aktif' (spasi), bukan 'Non-Aktif' (dash)
3. `kelompok_jabatan` menggunakan 'ACCOUNT EXECUTIVE / AE' (dengan spasi), bukan 'ACCOUNT EXECUTIVE/AE'
4. Banyak field hanya terisi untuk PEGAWAI TETAP (202 orang): TMT Pensiun, Grade, Kelompok Jabatan, Kelas Jabatan, Weight, Height
5. `kode_organisasi` hanya terisi 872/1414 (62%) -- banyak TAD tidak punya kode organisasi
6. Nilai `-` di CSV harus dianggap NULL/kosong
7. Format tanggal campuran: `DD/MM/YYYY` dan `YYYY-MM-DD` dan `DD-MM-YYYY` semua ada di CSV
8. Provider 'PT Graha Humanindo Manajemen' (ejaan Bahasa Indonesia) berbeda dengan 'PT Grha Humanindo Management' di project lama
```

## Tabel-Tabel Database

### 1. Tabel `user` (Pengguna Sistem — Login via NIP)

Setiap karyawan yang di-import otomatis mendapat akun login. NIP menjadi username, password default = NIP.

```sql
CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id UUID UNIQUE NOT NULL,
  nip VARCHAR(30) UNIQUE NOT NULL,          -- NIP sebagai username login, merujuk ke employee.nip
  email VARCHAR(255),                       -- Email opsional (dari data employee)
  full_name VARCHAR(200) NOT NULL,          -- Nama lengkap (dari data employee)
  role VARCHAR(20) NOT NULL DEFAULT 'staff', -- 'super_admin', 'admin', 'staff'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  employee_id BIGINT REFERENCES employee(id) ON DELETE SET NULL, -- Link ke data karyawan
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_supabase_id ON "user"(supabase_auth_id);
CREATE INDEX idx_user_nip ON "user"(nip);
CREATE INDEX idx_user_role ON "user"(role);
CREATE INDEX idx_user_employee ON "user"(employee_id);
```

**Mekanisme pembuatan akun otomatis saat import:**
1. Saat data SDM di-import via Excel, setiap karyawan yang berhasil masuk ke tabel `employee` secara otomatis dibuatkan akun di tabel `user`
2. `nip` = NIP karyawan (username login)
3. Password = NIP karyawan (di-hash via Supabase Auth)
4. `role` default = `'staff'` (read-only). Super Admin bisa mengubah role setelahnya
5. `full_name` diambil dari `employee.nama_lengkap`
6. `email` diambil dari `employee.email` (jika ada)
7. `employee_id` di-link ke record employee yang bersangkutan
```

### 2. Tabel `organization` (Unit Kerja / Organisasi)

```sql
CREATE TABLE organization (
  id SERIAL PRIMARY KEY,
  kode_organisasi VARCHAR(10) UNIQUE NOT NULL,
  nama_organisasi VARCHAR(200) NOT NULL,
  unit_organisasi unit_organisasi_type NOT NULL,
  parent_id INTEGER REFERENCES organization(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_kode ON organization(kode_organisasi);
CREATE INDEX idx_org_unit ON organization(unit_organisasi);
CREATE INDEX idx_org_parent ON organization(parent_id);
```

### 3. Tabel `employee` (Data Karyawan -- TABEL UTAMA)

Field-field ini disamakan persis dengan project Laravel yang sudah berjalan agar import CSV/Excel dari sistem lama bisa seamless.

```sql
CREATE TABLE employee (
  id BIGSERIAL PRIMARY KEY,

  -- ============================================================
  -- NOMOR URUT & IDENTITAS
  -- ============================================================
  no INTEGER,                               -- Nomor urut dari CSV/import
  nik VARCHAR(20) UNIQUE,                   -- Nomor Induk Kependudukan (KTP), bisa NULL
  nip VARCHAR(30) UNIQUE NOT NULL,          -- Nomor Induk Pegawai (internal company) - WAJIB & UNIK, juga dipakai sebagai username login

  -- ============================================================
  -- DATA PRIBADI
  -- ============================================================
  nama_lengkap VARCHAR(200) NOT NULL,       -- Nama lengkap sesuai KTP
  jenis_kelamin VARCHAR(10),                -- 'L' atau 'P'
  tempat_lahir VARCHAR(100),
  tanggal_lahir DATE,
  usia INTEGER,                             -- Dihitung otomatis atau dari CSV
  alamat TEXT,                              -- Alamat lengkap (gabungan)
  kota_domisili VARCHAR(100),               -- Kota domisili
  handphone VARCHAR(30),                    -- Nomor HP utama
  email VARCHAR(255) UNIQUE,                -- Email (biasanya email kantor)

  -- ============================================================
  -- DATA KEPEGAWAIAN
  -- ============================================================
  status_pegawai VARCHAR(50),               -- 'PEGAWAI TETAP' atau 'TAD' (hanya 2 nilai di CSV)
  status_kontrak VARCHAR(50),               -- FIELD BARU dari CSV: 'PEGAWAI TETAP', 'PKWT', 'PAKET SDM', 'PAKET PEKERJAAN'
  status_kerja VARCHAR(20) DEFAULT 'Non Aktif', -- 'Aktif', 'Non Aktif', 'Pensiun', 'Mutasi' (PERHATIAN: 'Non Aktif' pakai spasi, bukan dash)
  provider VARCHAR(100),                    -- Nama provider/perusahaan penyedia
  lokasi_kerja VARCHAR(200) DEFAULT 'Bandar Udara Ngurah Rai',
  cabang VARCHAR(10) DEFAULT 'DPS',

  -- Organisasi & Jabatan
  kode_organisasi VARCHAR(10),              -- Kode unit: MO, ME, MF, MS, MU, MK, MQ, MB, EGM, GM
  unit_organisasi VARCHAR(50),              -- Kategori: AIRSIDE, LANDSIDE, GSE, GH, BACK OFFICE, Ancillary, Avsec, EGM, GM (PERHATIAN: casing tidak konsisten di CSV, perlu normalisasi)
  nama_organisasi VARCHAR(200),             -- Nama lengkap organisasi
  sub_unit_organisasi VARCHAR(200),         -- Sub unit organisasi (text field dari CSV, 27 unique values: APRON, GSE BTT, LOADING MASTER, dll)
  unit_id BIGINT,                           -- FK ke tabel units (cascading dropdown)
  sub_unit_id BIGINT,                       -- FK ke tabel sub_units (cascading dropdown)
  nama_jabatan VARCHAR(200),                -- Jabatan saat ini
  jabatan VARCHAR(200),                     -- Jabatan (field duplikat dari CSV, bisa sama dengan nama_jabatan)
  kelompok_jabatan VARCHAR(100),            -- 'ACCOUNT EXECUTIVE / AE', 'EXECUTIVE GENERAL MANAGER', 'GENERAL MANAGER', 'MANAGER', 'STAFF', 'SUPERVISOR', 'NON'
  kelas_jabatan VARCHAR(100),               -- Kelas jabatan detail
  unit_kerja_kontrak VARCHAR(255),          -- Unit kerja sesuai kontrak (bisa beda dengan penempatan)
  grade VARCHAR(50),                        -- Grade karyawan (I, II, III, ... XII)
  kategori_karyawan VARCHAR(100),           -- Kategori karyawan

  -- Tanggal-tanggal kepegawaian (TMT = Terhitung Mulai Tanggal)
  tmt_mulai_kerja DATE,                     -- TMT mulai kerja
  tmt_berakhir_kerja DATE,                  -- TMT berakhir kerja (jika sudah keluar)
  tmt_mulai_jabatan DATE,                   -- TMT mulai jabatan saat ini
  tmt_akhir_jabatan DATE,                   -- TMT akhir jabatan saat ini
  tmt_berakhir_jabatan DATE,                -- TMT berakhir jabatan (field alternatif dari CSV)
  tmt_pensiun DATE,                         -- Tanggal pensiun
  masa_kerja VARCHAR(50),                   -- Masa kerja calculated: "X tahun Y bulan"
  masa_kerja_bulan VARCHAR(20),             -- Masa kerja dalam bulan (dari CSV)
  masa_kerja_tahun VARCHAR(20),             -- Masa kerja dalam tahun (dari CSV)

  -- ============================================================
  -- DATA PENDIDIKAN (denormalized, langsung di tabel employee)
  -- ============================================================
  pendidikan VARCHAR(100),                  -- Label pendidikan dari CSV (e.g. 'SEKOLAH MENENGAH ATAS')
  pendidikan_terakhir VARCHAR(100),         -- Jenjang pendidikan terakhir
  instansi_pendidikan VARCHAR(200),         -- Nama universitas/sekolah
  jurusan VARCHAR(200),                     -- Jurusan/program studi
  remarks_pendidikan VARCHAR(100),          -- Keterangan pendidikan (LULUS, dll)
  tahun_lulus INTEGER,                      -- Tahun lulus

  -- ============================================================
  -- DATA ADMINISTRASI (BPJS, dll)
  -- ============================================================
  no_bpjs_kesehatan VARCHAR(50),            -- Nomor BPJS Kesehatan
  no_bpjs_ketenagakerjaan VARCHAR(50),      -- Nomor BPJS Ketenagakerjaan

  -- ============================================================
  -- DATA FISIK & SERAGAM
  -- ============================================================
  height INTEGER,                           -- Tinggi badan dalam cm
  weight INTEGER,                           -- Berat badan dalam kg
  jenis_sepatu VARCHAR(50),                 -- 'Pantofel', 'Safety Shoes'
  ukuran_sepatu VARCHAR(10),                -- Ukuran sepatu (36-46)
  seragam VARCHAR(100),                     -- Ukuran/info seragam

  -- ============================================================
  -- RELASI & STATUS
  -- ============================================================
  organization_id INTEGER REFERENCES organization(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',      -- Status record: 'active', 'inactive'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Primary indexes
CREATE INDEX idx_emp_nik ON employee(nik);
CREATE INDEX idx_emp_nip ON employee(nip);
CREATE INDEX idx_emp_nama ON employee(nama_lengkap);
CREATE INDEX idx_emp_status_pegawai ON employee(status_pegawai);
CREATE INDEX idx_emp_status_kontrak ON employee(status_kontrak);
CREATE INDEX idx_emp_status_kerja ON employee(status_kerja);
CREATE INDEX idx_emp_provider ON employee(provider);
CREATE INDEX idx_emp_unit_organisasi ON employee(unit_organisasi);
CREATE INDEX idx_emp_kode_org ON employee(kode_organisasi);
CREATE INDEX idx_emp_org_id ON employee(organization_id);
CREATE INDEX idx_emp_unit_id ON employee(unit_id);
CREATE INDEX idx_emp_sub_unit_id ON employee(sub_unit_id);
CREATE INDEX idx_emp_cabang ON employee(cabang);
CREATE INDEX idx_emp_tmt_mulai ON employee(tmt_mulai_kerja);
CREATE INDEX idx_emp_grade ON employee(grade);
CREATE INDEX idx_emp_tmt_berakhir ON employee(tmt_berakhir_kerja);

-- Full-text search index
CREATE INDEX idx_emp_search ON employee USING gin(
  to_tsvector('indonesian',
    COALESCE(nama_lengkap, '') || ' ' ||
    COALESCE(nip, '') || ' ' ||
    COALESCE(nik, '') || ' ' ||
    COALESCE(nama_jabatan, '') || ' ' ||
    COALESCE(nama_organisasi, '')
  )
);
```

### 4. Tabel `unit` (Unit Kerja — untuk Cascading Dropdown)

```sql
CREATE TABLE unit (
  id BIGSERIAL PRIMARY KEY,
  unit_organisasi VARCHAR(50) NOT NULL,     -- 'Airside', 'Landside', dll
  kode VARCHAR(10) NOT NULL,                -- 'MO', 'ME', 'MF', dll
  nama VARCHAR(200) NOT NULL,               -- 'OPERATION SERVICES', dll
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unit_organisasi ON unit(unit_organisasi);
CREATE INDEX idx_unit_kode ON unit(kode);
```

### 5. Tabel `sub_unit` (Sub Unit — Child dari Unit)

```sql
CREATE TABLE sub_unit (
  id BIGSERIAL PRIMARY KEY,
  unit_id BIGINT NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  nama VARCHAR(200) NOT NULL,
  kode VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sub_unit_parent ON sub_unit(unit_id);
```

### 6. Tabel `activity_log` (Log Aktivitas)

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
  user_email VARCHAR(255),                  -- Denormalized untuk log permanen
  user_name VARCHAR(150),                   -- Denormalized
  activity activity_type NOT NULL,
  description TEXT NOT NULL,                -- Deskripsi aktivitas dalam bahasa Indonesia
  target_type VARCHAR(50),                  -- 'employee', 'user', 'document', dll
  target_id UUID,                           -- ID record yang terpengaruh
  target_label VARCHAR(200),                -- Nama karyawan / label untuk tampilan
  metadata JSONB,                           -- Data tambahan (old_value, new_value, dll)
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_log_user ON activity_log(user_id);
CREATE INDEX idx_log_activity ON activity_log(activity);
CREATE INDEX idx_log_target ON activity_log(target_type, target_id);
CREATE INDEX idx_log_created ON activity_log(created_at DESC);
```

### 10. Tabel `import_log` (Log Import Excel)

```sql
CREATE TABLE import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,                            -- URL file asli di storage
  total_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_details JSONB,                      -- Array of {row, field, message}
  status VARCHAR(20) DEFAULT 'processing',  -- processing, completed, failed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_user ON import_log(user_id);
CREATE INDEX idx_import_status ON import_log(status);
CREATE INDEX idx_import_created ON import_log(created_at DESC);
```

### 11. Tabel `app_setting` (Pengaturan Aplikasi)

```sql
CREATE TABLE app_setting (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,         -- 'company_name', 'import_template_version', dll
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES "user"(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Row Level Security (RLS) Policies

```sql
-- ============================================================
-- USER TABLE: User bisa baca profil sendiri, super_admin bisa CRUD semua
-- ============================================================
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_read_own ON "user"
  FOR SELECT USING (
    supabase_auth_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid() AND u.role = 'super_admin'
    )
  );

CREATE POLICY user_manage_super_admin ON "user"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- ============================================================
-- EMPLOYEE TABLE: staff = read only, admin/super_admin = full CRUD
-- ============================================================
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_read_all ON employee
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid() AND u.status = 'active'
    )
  );

CREATE POLICY employee_write_admin ON employee
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid()
        AND u.role IN ('super_admin', 'admin') AND u.status = 'active'
    )
  );

CREATE POLICY employee_update_admin ON employee
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid()
        AND u.role IN ('super_admin', 'admin') AND u.status = 'active'
    )
  );

CREATE POLICY employee_delete_admin ON employee
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid()
        AND u.role IN ('super_admin', 'admin') AND u.status = 'active'
    )
  );

-- ============================================================
-- UNIT & SUB_UNIT: Semua user aktif bisa baca
-- ============================================================
ALTER TABLE unit ENABLE ROW LEVEL SECURITY;
CREATE POLICY unit_read ON unit FOR SELECT USING (
  EXISTS (SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid() AND u.status = 'active')
);

ALTER TABLE sub_unit ENABLE ROW LEVEL SECURITY;
CREATE POLICY sub_unit_read ON sub_unit FOR SELECT USING (
  EXISTS (SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid() AND u.status = 'active')
);

-- ============================================================
-- ORGANIZATION: Semua user aktif bisa baca, hanya super_admin bisa edit
-- ============================================================
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_read ON organization
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid() AND u.status = 'active')
  );

CREATE POLICY org_manage ON organization
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid()
      AND u.role = 'super_admin' AND u.status = 'active')
  );

-- ============================================================
-- ACTIVITY LOG: Semua user aktif bisa baca, server yang menulis
-- ============================================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY log_read ON activity_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid() AND u.status = 'active')
  );

CREATE POLICY log_insert ON activity_log
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- IMPORT LOG: Admin+ bisa baca, server yang menulis
-- ============================================================
ALTER TABLE import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_log_read ON import_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "user" u WHERE u.supabase_auth_id = auth.uid()
      AND u.role IN ('super_admin', 'admin') AND u.status = 'active')
  );

CREATE POLICY import_log_insert ON import_log
  FOR INSERT WITH CHECK (true);
```

## Mapping Import/Export Excel

### Template Excel untuk Import

Kolom Excel harus sesuai dengan CSV "Dashboard Data SDM DATABASE SDM" yang sudah dianalisis. **45 kolom, 1414 data karyawan.**

| # | Header CSV | Field Database | Tipe | Wajib | Fill Rate | Catatan |
|---|-----------|---------------|------|-------|-----------|---------|
| 0 | NO | no | integer | Tidak | 100% | Nomor urut |
| 1 | NIP | nip | string | Ya | 99.6% | WAJIB. Juga = username & password login |
| 2 | KTP / NIK | nik | string | Tidak | 85.7% | NIK KTP |
| 3 | NAMA LENGKAP | nama_lengkap | string | Ya | 100% | Nama sesuai KTP |
| 4 | LOKASI KERJA | lokasi_kerja | string | Tidak | 100% | Default: 'Bandar Udara Ngurah Rai' |
| 5 | CABANG | cabang | string | Tidak | 100% | Default: 'DPS' |
| 6 | STATUS PEGAWAI | status_pegawai | string | Tidak | 100% | Hanya: 'PEGAWAI TETAP' atau 'TAD' |
| 7 | STATUS KONTRAK | status_kontrak | string | Tidak | 100% | **FIELD BARU**: 'PEGAWAI TETAP', 'PKWT', 'PAKET SDM', 'PAKET PEKERJAAN' |
| 8 | STATUS KERJA | status_kerja | string | Tidak | 100% | 'Aktif', 'Non Aktif', 'Pensiun', 'Mutasi' (SPASI bukan dash) |
| 9 | PROVIDER | provider | string | Tidak | 100% | 10 provider (lihat enum) |
| 10 | UNIT ORGANISASI | unit_organisasi | string | Tidak | 100% | CASING TIDAK KONSISTEN, perlu normalisasi |
| 11 | KODE ORGANISASI | kode_organisasi | string | Tidak | 61.7% | MO, ME, MF, MS, MU, MK, MQ, MB, EGM, GM |
| 12 | NAMA ORGANISASI | nama_organisasi | string | Tidak | 97.5% | Nama lengkap organisasi |
| 13 | SUB UNIT ORGANISASI | sub_unit_organisasi | string | Tidak | 76.2% | **FIELD BARU**: 27 unique values (APRON, GSE BTT, dll) |
| 14 | NAMA JABATAN | nama_jabatan | string | Tidak | 99.4% | Posisi saat ini |
| 15 | UNIT KERJA SESUAI KONTRAK | unit_kerja_kontrak | string | Tidak | 75.8% | Unit kerja di kontrak |
| 16 | TMT MULAI KERJA | tmt_mulai_kerja | date | Tidak | 82.7% | Format campuran: DD/MM/YYYY atau YYYY-MM-DD |
| 17 | TMT MULAI JABATAN | tmt_mulai_jabatan | date | Tidak | 77.0% | Format campuran |
| 18 | TMT BERAKHIR JABATAN | tmt_berakhir_jabatan | date | Tidak | 9.1% | Hanya sedikit terisi |
| 19 | TMT BERAKHIR KERJA | tmt_berakhir_kerja | date | Tidak | 23.1% | Terisi untuk yang sudah keluar |
| 20 | MASA KERJA (BULAN) | masa_kerja_bulan | string | Tidak | 56.2% | Format: "XX Bulan" |
| 21 | MASA KERJA (TAHUN) | masa_kerja_tahun | string | Tidak | 56.2% | Format: "XX Tahun" |
| 22 | JENIS KELAMIN | jenis_kelamin | string | Tidak | 98.6% | L / P |
| 23 | JENIS SEPATU | jenis_sepatu | string | Tidak | 47.5% | Pantofel / Safety Shoes |
| 24 | UKURAN SEPATU | ukuran_sepatu | string | Tidak | 30.7% | 36-46 |
| 25 | TEMPAT LAHIR | tempat_lahir | string | Tidak | 83.7% | Kota |
| 26 | TANGGAL LAHIR | tanggal_lahir | date | Tidak | 83.7% | Format: YYYY-MM-DD di CSV |
| 27 | USIA | usia | integer | Tidak | 45.4% | Bisa dihitung otomatis |
| 28 | KOTA DOMISILI | kota_domisili | string | Tidak | 83.7% | |
| 29 | ALAMAT | alamat | string | Tidak | 83.7% | Alamat lengkap |
| 30 | PENDIDIKAN | pendidikan | string | Tidak | 83.0% | Label: SARJANA, DIPLOMA III, dll |
| 31 | NAMA INSTANSI PENDIDIKAN | instansi_pendidikan | string | Tidak | 82.9% | Nama sekolah/universitas |
| 32 | JURUSAN | jurusan | string | Tidak | 72.9% | Program studi |
| 33 | REMARKS PENDIDIKAN | remarks_pendidikan | string | Tidak | 2.5% | Keterangan (LULUS, dll) |
| 34 | TAHUN LULUS | tahun_lulus | integer | Tidak | 79.8% | 4 digit tahun |
| 35 | HANDPHONE | handphone | string | Tidak | 95.3% | Nomor HP |
| 36 | KATEGORI KARYAWAN | kategori_karyawan | string | Tidak | 2.0% | Jarang terisi |
| 37 | TMT PENSIUN | tmt_pensiun | date | Tidak | 14.3% | Hanya Pegawai Tetap |
| 38 | GRADE | grade | string | Tidak | 14.1% | Hanya Pegawai Tetap |
| 39 | NO BPJS KESEHATAN | no_bpjs_kesehatan | string | Tidak | 82.5% | |
| 40 | NO BPJS KETENAGAKERJAAN | no_bpjs_ketenagakerjaan | string | Tidak | 82.3% | |
| 41 | KELOMPOK JABATAN | kelompok_jabatan | string | Tidak | 13.9% | Hanya Pegawai Tetap |
| 42 | KELAS JABATAN | kelas_jabatan | string | Tidak | 13.5% | Hanya Pegawai Tetap |
| 43 | WEIGHT | weight | integer | Tidak | 13.4% | Berat badan (kg) |
| 44 | HEIGHT | height | integer | Tidak | 13.4% | Tinggi badan (cm) |

### Aturan Import

1. Row pertama adalah header -- digunakan untuk mapping kolom
2. Import dimulai dari row ke-2
3. Row dengan `nama_lengkap` kosong di-skip
4. `nip` WAJIB ada -- row tanpa NIP di-skip dan masuk error report
5. Jika `nip` sudah ada di database: UPDATE seluruh field (bukan duplikat)
6. Jika `nip` belum ada: INSERT baru + AUTO-CREATE akun login (password = NIP)
7. Semua validasi enum harus case-insensitive matching
8. Tanggal bisa dalam format DD/MM/YYYY, YYYY-MM-DD, atau Excel serial number
9. Row yang gagal validasi dikumpulkan di error report, row lain tetap diproses
10. Setelah import: tampilkan summary (total, berhasil, gagal, skip, akun baru dibuat)
11. Nilai `-` atau `?` di CSV dianggap NULL/kosong
12. Field `masa_kerja` dihitung otomatis dari `tmt_mulai_kerja` jika tersedia

---

# D. FITUR & USER FLOW

## Flow 1: Login & Autentikasi (NIP + Password)

```
[Login Page - /login]
|
+-- Input NIP + Password
|   (placeholder: "Masukkan NIP Anda", "Masukkan Password")
|   (password default = NIP karyawan, bisa diubah setelah login pertama)
|
v
[Supabase Auth] -- Verifikasi kredensial via NIP
|   (NIP di-lookup dari tabel user, kemudian login via Supabase Auth)
|
+-- Gagal -> Tampilkan error "NIP atau password salah"
|
+-- Berhasil -> Cek user di tabel "user"
    |
    +-- User tidak ada / inactive -> Tampilkan "Akun tidak terdaftar atau nonaktif"
    |
    +-- User active -> Redirect berdasarkan role:
        |
        +-- super_admin -> /dashboard (full menu: Dashboard, Karyawan, Import/Export, Users, Activity Log)
        +-- admin -> /dashboard (menu: Dashboard, Karyawan, Import/Export, Activity Log)
        +-- staff -> /dashboard (menu: Dashboard, Karyawan read-only, Export saja)
```

**Catatan penting autentikasi:**
- Tidak ada Google OAuth atau provider login eksternal
- Akun dibuat otomatis saat import data SDM (NIP = username, password = NIP)
- Super Admin bisa membuat akun manual dan mengubah role
- User bisa mengubah password sendiri setelah login pertama
- Jika NIP belum punya akun (belum di-import), user tidak bisa login

## Flow 2: Dashboard Statistik

```
[Dashboard - /dashboard]
|
+-- Header: Selamat datang, [nama]. Hari ini [tanggal WITA]
|
+-- Stats Cards (5 kartu):
|   [Total Karyawan: 1414]
|   [Pegawai Tetap: 202]
|   [TAD Total: 1212 (Paket Pekerjaan: 1017 | PKWT: 139 | Paket SDM: 56)]
|   [Aktif: xxx]
|   [Unit Unik: xxx]
|
+-- Chart Row 1: SDM per Status Kontrak (Donut) | SDM per Kelompok Jabatan (Bar)
+-- Chart Row 2: SDM per Unit Organisasi (Bar) — normalisasi casing
+-- Chart Row 3: SDM per Provider (Bar)
|
+-- Setiap chart bisa diklik untuk melihat detail breakdown
+-- Quick Actions: [Tambah Karyawan] [Import Excel] [Export Excel]
+-- Aktivitas Terbaru: 5 log terakhir
```

## Flow 3: Daftar Karyawan (Index)

```
[Employees - /employees]
|
+-- Header: "Management Karyawan" + jumlah total
|
+-- Toolbar:
|   [Search: nama/NIP/NIK]
|   [Filter: Status Pegawai | Unit Organisasi | Provider | Status Kerja]
|   [Tombol: Tambah | Import | Export]
|
+-- Tabel Karyawan:
|   Kolom: No | Nama | NIP | Unit | Jabatan | Status | Provider | Aksi
|   Klik nama -> /employees/[id] (detail)
|   Aksi: [View] [Edit] [Delete]
|   Pagination server-side (20 per halaman)
|
+-- Stats Mini Cards di atas tabel:
    [Total] [Pegawai Tetap] [PKWT] [TAD] [Unit Unik] [Baru Hari Ini]
```

## Flow 4: Tambah Karyawan (Create)

```
[Create - /employees/create]
|
+-- Form Multi-Section dengan Tab Navigation:
|
|   [Data Pribadi] [Kepegawaian] [Pendidikan] [Data Tambahan]
|
|   Tab 1 - Data Pribadi:
|   - NIK (opsional), NIP (wajib, unique check realtime), Nama Lengkap (wajib)
|   - Jenis Kelamin (wajib: Laki-laki/Perempuan), Tempat Lahir, Tanggal Lahir
|   - Alamat, Kota Domisili, Handphone, Email
|
|   Tab 2 - Kepegawaian:
|   - Status Pegawai (wajib, dropdown), Status Kerja (auto/manual), Provider (dropdown)
|   - Lokasi Kerja (fixed: Bandar Udara Ngurah Rai), Cabang (fixed: DPS)
|   - Unit Organisasi (wajib, cascading dropdown) -> Unit (wajib) -> Sub Unit (wajib jika bukan EGM/GM)
|   - Kode Organisasi, Nama Organisasi (auto-fill dari cascading)
|   - Nama Jabatan (wajib), Kelompok Jabatan (wajib, dropdown)
|   - Kelas Jabatan, Unit Kerja Kontrak, Grade, Kategori Karyawan
|   - TMT Mulai Kerja, TMT Berakhir Kerja
|   - TMT Mulai Jabatan, TMT Akhir Jabatan
|   - TMT Pensiun, Masa Kerja (auto-calculated)
|   - BPJS Kesehatan, BPJS Ketenagakerjaan
|
|   Tab 3 - Pendidikan:
|   - Pendidikan Terakhir, Instansi Pendidikan, Jurusan
|   - Tahun Lulus, Remarks Pendidikan
|
|   Tab 4 - Data Tambahan:
|   - Tinggi Badan, Berat Badan
|   - Jenis Sepatu (dropdown: Pantofel/Safety Shoes), Ukuran Sepatu (dropdown: 36-46)
|   - Seragam
|
+-- Tombol: [Batal] [Simpan]
|
+-- Validasi wajib:
|   - NIP: wajib, unik (cek realtime)
|   - Nama Lengkap: wajib
|   - Jenis Kelamin: wajib
|   - Unit Organisasi: wajib
|   - Unit (unit_id): wajib
|   - Sub Unit (sub_unit_id): wajib (kecuali EGM/GM)
|   - Nama Jabatan: wajib
|   - Kelompok Jabatan: wajib
|   - Status Pegawai: wajib
|
+-- Berhasil -> Redirect ke /employees dengan notifikasi sukses
+-- Gagal -> Tampilkan error per field
```

## Flow 5: Detail Karyawan (Show)

```
[Show - /employees/[id]]
|
+-- Header: Nama + NIP + Jabatan + Status Badge
|
+-- Tab/Section Layout:
|
|   [Data Pribadi]
|   - NIK, Nama, Jenis Kelamin, Tempat/Tanggal Lahir, Usia
|   - Alamat, Kota Domisili, Handphone, Email
|
|   [Data Kepegawaian]
|   - NIP, Status Pegawai, Status Kerja, Provider
|   - Lokasi Kerja, Cabang
|   - Kode Organisasi, Unit Organisasi, Nama Organisasi
|   - Nama Jabatan, Kelompok Jabatan, Kelas Jabatan, Grade
|   - Unit Kerja Kontrak, Kategori Karyawan
|   - TMT Mulai Kerja, TMT Berakhir Kerja, Masa Kerja
|   - TMT Mulai Jabatan, TMT Akhir Jabatan
|   - TMT Pensiun
|
|   [Data Pendidikan]
|   - Pendidikan Terakhir, Instansi Pendidikan, Jurusan
|   - Tahun Lulus, Remarks Pendidikan
|
|   [Data Administrasi]
|   - BPJS Kesehatan, BPJS Ketenagakerjaan
|
|   [Data Fisik & Seragam]
|   - Tinggi Badan, Berat Badan
|   - Jenis Sepatu, Ukuran Sepatu, Seragam
|
+-- Aksi: [Edit] [Delete] [Kembali ke Daftar] (admin+ only untuk Edit/Delete)
```

## Flow 6: Import Excel (FITUR KRITIS)

```
[Import - /employees/import]
|
+-- Step 1: Download Template
|   - Tombol "Download Template Excel"
|   - Template berisi header kolom yang sesuai persis dengan field database
|   - Deskripsi format dan aturan pengisian
|
+-- Step 2: Upload File
|   - Drag & drop area atau klik untuk pilih file
|   - Hanya .xlsx dan .csv, max 10MB
|
+-- Step 3: Preview & Validasi
|   - Tabel preview data dari file (scrollable)
|   - Highlight row yang valid (hijau) dan error (merah)
|   - Detail error per row per field
|   - Stats: "200 valid, 5 error, 3 skip (NIP duplikat)"
|   - Row tanpa nama_lengkap otomatis di-skip
|   - Row dengan NIP yang sudah ada -> UPDATE (bukan duplikat)
|
+-- Step 4: Konfirmasi Import
|   - "Yakin import 200 data karyawan? (195 baru, 5 update)"
|   - [Batal] [Import Sekarang]
|
+-- Step 5: Progress & Hasil
|   - Progress bar: "Processing 150/200..."
|   - Proses import melakukan 2 hal:
|     1. Insert/Update data karyawan ke tabel employee
|     2. Auto-create akun login di tabel user untuk setiap karyawan:
|        - NIP = username
|        - Password = NIP (di-hash)
|        - Role = 'staff' (default)
|        - Jika akun sudah ada (NIP sudah terdaftar) -> SKIP pembuatan akun
|   - Selesai: "Import selesai! 198 berhasil, 2 gagal. 195 akun baru dibuat."
|   - Tombol: [Download Error Report] [Lihat Data] [Import Lagi]
```

**ATURAN IMPORT YANG WAJIB DIPENUHI:**
1. Data yang di-import harus tampil SEMPURNA tanpa ada data yang hilang atau tidak muncul
2. Semua field dari CSV/Excel harus ter-mapping dengan benar ke kolom database
3. NIP yang sudah ada = UPDATE data, NIP baru = INSERT baru
4. Tanggal bisa dalam format DD/MM/YYYY, YYYY-MM-DD, atau Excel serial number -- semua harus di-handle
5. Validasi enum harus case-insensitive
6. Setiap karyawan yang berhasil di-import OTOMATIS mendapat akun login (NIP = password)
7. Error pada satu row TIDAK boleh menghentikan import row lainnya
8. Error report harus detail: nomor row, field yang bermasalah, pesan error

## Flow 7: Export Excel

```
[Export - dari halaman Employees atau Dashboard]
|
+-- Modal Export Options:
|   - Pilih data: [Semua Karyawan] [Sesuai Filter Aktif] [Per Unit]
|   - Pilih kolom: [Semua Kolom] [Kolom Dasar] [Custom]
|   - Format: .xlsx
|
+-- Klik [Export]
|   - Loading: "Mempersiapkan file..."
|   - Download otomatis: "SDM_GapuraAngkasa_[tanggal].xlsx"
|
+-- File Excel hasil export:
    - Header row dengan styling (bold, background hijau #439454, text putih)
    - Data rows
    - Auto-fit column width
    - Sheet name: "Data SDM"
```

## Flow 8: Manajemen User (Super Admin Only)

```
[Users - /users]
|
+-- Tabel user: NIP, Nama, Email, Role, Status, Last Login
|
+-- Tombol [Tambah User Manual]
|   - Form: NIP, Nama Lengkap, Password (default = NIP), Role
|   - Bisa juga link ke employee yang sudah ada tapi belum punya akun
|
+-- Aksi per user:
|   - [Ubah Role] -> dropdown: super_admin / admin / staff
|   - [Nonaktifkan] -> set status = inactive (tidak bisa login)
|   - [Aktifkan] -> set status = active
|   - [Reset Password] -> password direset ke NIP karyawan
|
+-- Tidak bisa menonaktifkan akun sendiri
+-- Tidak bisa mengubah role sendiri
+-- Catatan: Mayoritas akun dibuat otomatis saat import SDM
```

---

# E. API ENDPOINTS

## Konvensi

- Base URL: `/api` (Next.js API Routes)
- Autentikasi: Supabase JWT via cookie (otomatis dari Supabase Auth SSR)
- Format response: `{ success: boolean, data?: T, error?: { code: string, message: string } }`
- Middleware di route handler: cek role via helper function
- Timezone: Semua timestamp dalam UTC, dikonversi ke WITA di frontend

## Auth Endpoints

| Method | Path | Deskripsi | Role | Request Body | Response |
|--------|------|-----------|------|-------------|----------|
| POST | `/api/auth/login` | Login via NIP + password | - | `{ nip, password }` | `{ user, session }` |
| POST | `/api/auth/logout` | Logout | auth | - | `{ message }` |
| GET | `/api/auth/session` | Cek sesi aktif + role | auth | - | `{ user, role }` |
| POST | `/api/auth/change-password` | Ubah password sendiri | auth | `{ current_password, new_password }` | `{ message }` |

## User Management Endpoints (Super Admin)

| Method | Path | Deskripsi | Role | Request Body | Response |
|--------|------|-----------|------|-------------|----------|
| GET | `/api/users` | Daftar semua user | super_admin | Query: `?page=1&limit=20` | `{ users[], pagination }` |
| POST | `/api/users` | Buat user manual (NIP + password) | super_admin | `{ nip, full_name, password, role }` | `{ user }` |
| GET | `/api/users/[id]` | Detail user | super_admin | - | `{ user }` |
| PUT | `/api/users/[id]` | Update role/status user | super_admin | `{ role?, status? }` | `{ user }` |
| DELETE | `/api/users/[id]` | Deactivate user | super_admin | - | `{ message }` |
| POST | `/api/users/[id]/reset-password` | Reset password ke NIP | super_admin | - | `{ message }` |

## Employee Endpoints

| Method | Path | Deskripsi | Role | Request/Query | Response |
|--------|------|-----------|------|-------------|----------|
| GET | `/api/employees` | Daftar karyawan (paginated) | auth | Query: `?page=1&limit=20&search=&status_pegawai=&unit_organisasi=&provider=&status_kerja=&sort=nama_lengkap&order=asc` | `{ employees[], pagination, statistics }` |
| POST | `/api/employees` | Tambah karyawan | admin+ | `{ ...employeeData }` | `{ employee }` |
| GET | `/api/employees/[id]` | Detail karyawan + relasi | auth | - | `{ employee, families, educations, positions, contracts, documents }` |
| PUT | `/api/employees/[id]` | Update karyawan | admin+ | `{ ...employeeData }` | `{ employee }` |
| DELETE | `/api/employees/[id]` | Hapus karyawan | admin+ | - | `{ message }` |
| GET | `/api/employees/validate/nip/[nip]` | Cek NIP unik | admin+ | - | `{ available: boolean }` |
| GET | `/api/employees/validate/nik/[nik]` | Cek NIK unik | admin+ | - | `{ available: boolean }` |

## Import/Export Endpoints

| Method | Path | Deskripsi | Role | Request | Response |
|--------|------|-----------|------|---------|----------|
| GET | `/api/import/template` | Download template Excel | admin+ | - | File .xlsx |
| POST | `/api/import/preview` | Preview file Excel (validasi tanpa import) | admin+ | FormData: `{ file }` | `{ rows[], valid_count, error_count, errors[] }` |
| POST | `/api/import/execute` | Eksekusi import | admin+ | `{ rows: validatedRows[] }` | `{ success_count, error_count, errors[] }` |
| GET | `/api/import/logs` | Riwayat import | admin+ | - | `{ logs[] }` |
| POST | `/api/export` | Export data ke Excel | auth | `{ filter?, columns? }` | File .xlsx |

## Dashboard Endpoints

| Method | Path | Deskripsi | Role | Response |
|--------|------|-----------|------|----------|
| GET | `/api/dashboard/statistics` | Statistik ringkasan | auth | `{ total, pegawaiTetap, tad, tadPaketPekerjaan, tadPkwt, tadPaketSdm, aktif, nonAktif, uniqueUnits }` |
| GET | `/api/dashboard/charts` | Data chart | auth | `{ statusPegawai[], unitOrganisasi[], provider[], jabatan[] }` |
| GET | `/api/dashboard/activities` | Aktivitas terbaru | auth | `{ activities[] }` |

## Organization & Unit Endpoints

| Method | Path | Deskripsi | Role |
|--------|------|-----------|------|
| GET | `/api/organizations` | Daftar organisasi | auth |
| POST | `/api/organizations` | Tambah organisasi | super_admin |
| PUT | `/api/organizations/[id]` | Update organisasi | super_admin |
| DELETE | `/api/organizations/[id]` | Hapus organisasi | super_admin |
| GET | `/api/units` | Daftar semua unit | auth |
| GET | `/api/units?unit_organisasi=Airside` | Unit per kategori (cascading step 2) | auth |
| GET | `/api/units/[id]/sub-units` | Sub unit per unit (cascading step 3) | auth |

## Activity Log Endpoints

| Method | Path | Deskripsi | Role |
|--------|------|-----------|------|
| GET | `/api/activity-logs` | Daftar log (paginated + filter) | auth |
| GET | `/api/activity-logs/[id]` | Detail log | auth |

---

# F. UI/UX & DESIGN SYSTEM

## Identitas Visual

### Arah Estetika

**"Clean Corporate"** -- Desain bersih, profesional, dan serius yang cocok untuk aplikasi internal perusahaan. Mengutamakan readability, efisiensi penggunaan, dan hierarki informasi yang jelas. Tidak perlu dark mode (aplikasi kantor, digunakan siang hari di monitor).

### Color Palette

```
BRAND COLORS
Primary (Green)        #439454
Primary Hover          #3a8249
Primary Light          #e8f5e9
Primary Dark           #2d5a37
Primary Foreground     #FFFFFF (text di atas primary)

NEUTRALS
Background             #F9FAFB (gray-50)
Surface                #FFFFFF
Text Primary           #111827 (gray-900)
Text Secondary         #6B7280 (gray-500)
Text Muted             #9CA3AF (gray-400)
Border                 #E5E7EB (gray-200)
Border Dark            #D1D5DB (gray-300)
Input Background       #FFFFFF
Input Border           #D1D5DB (gray-300)
Input Focus Border     #439454

SEMANTIC
Success                #22C55E (green-500)
Success Light          #DCFCE7 (green-100)
Error                  #EF4444 (red-500)
Error Light            #FEE2E2 (red-100)
Warning                #F59E0B (amber-500)
Warning Light          #FEF3C7 (amber-100)
Info                   #3B82F6 (blue-500)
Info Light             #DBEAFE (blue-100)

STATUS BADGES
Aktif                  #22C55E (green)
Tidak Aktif            #EF4444 (red)
Cuti                   #F59E0B (amber)
Pensiun                #6B7280 (gray)

STATUS PEGAWAI BADGES
Pegawai Tetap          #3B82F6 (blue)
PKWT                   #8B5CF6 (violet)
TAD Paket SDM          #F97316 (orange)
TAD Paket Pekerjaan    #EC4899 (pink)
```

### CSS Variables (Tailwind Config)

```css
:root {
  --primary: #439454;
  --primary-hover: #3a8249;
  --primary-light: #e8f5e9;
  --primary-dark: #2d5a37;
  --primary-foreground: #ffffff;

  --background: #f9fafb;
  --surface: #ffffff;
  --foreground: #111827;
  --muted: #6b7280;
  --border: #e5e7eb;

  --radius: 0.75rem;
}
```

### Typography

| Penggunaan | Font | Weight | Size | Keterangan |
|-----------|------|--------|------|------------|
| **Semua teks** | **Figtree** | 300-800 | - | Satu font untuk seluruh aplikasi. Clean, modern, professional |
| Page Title | Figtree | 700-800 | 24-30px | Judul halaman |
| Section Heading | Figtree | 600-700 | 18-22px | Judul section/card |
| Body Text | Figtree | 400-500 | 14-16px | Teks umum |
| Small/Caption | Figtree | 400 | 12-13px | Label, hint, caption |
| Table Header | Figtree | 600 | 13-14px | Header kolom tabel |
| Table Body | Figtree | 400 | 13-14px | Isi tabel |
| Button | Figtree | 500-600 | 14px | Teks tombol |
| Input | Figtree | 400 | 14px | Teks input field |

### Komponen yang Perlu Dibuat

**Layout Components:**
- `AppShell` -- Layout utama dengan sidebar + main content area
- `Sidebar` -- Sidebar navigasi kiri (fixed, 256px width) dengan logo di atas, menu items, user info di bawah
- `TopBar` -- Header area dalam main content (breadcrumb, page title, actions)
- `PageContainer` -- Wrapper untuk konten halaman (max-width, padding)

**Data Display Components:**
- `DataTable` -- Tabel data dengan sorting, pagination, row actions. Berbasis shadcn/ui Table
- `StatCard` -- Kartu statistik kecil (ikon, label, angka, trend indicator)
- `StatusBadge` -- Badge status (Aktif/Non-aktif, Pegawai Tetap/PKWT/TAD)
- `EmployeeAvatar` -- Avatar karyawan (foto atau inisial dengan warna random)
- `EmptyState` -- State kosong dengan ilustrasi + pesan + CTA
- `DetailRow` -- Baris label-value untuk halaman detail (label kiri, value kanan)
- `SectionCard` -- Card dengan header dan konten untuk grouping data

**Form Components:**
- `InputField` -- Input text/number/date dengan label, icon, hint, error message
- `SelectField` -- Dropdown select (single) dengan search
- `CascadingSelect` -- Dropdown bertingkat (Unit Organisasi -> Kode Organisasi -> Nama Organisasi)
- `DatePickerField` -- Date picker dengan format Indonesia (DD/MM/YYYY)
- `FileUploadField` -- Upload file dengan drag & drop, preview, progress
- `TextareaField` -- Textarea dengan character count
- `FormSection` -- Wrapper section dalam form dengan judul
- `FormNotification` -- Notifikasi sukses/error setelah submit

**Action Components:**
- `ConfirmDialog` -- Dialog konfirmasi untuk delete, import, dll
- `ExportDialog` -- Modal opsi export (filter, kolom)
- `ImportWizard` -- Multi-step wizard untuk import Excel

**Chart Components:**
- `DonutChart` -- Donut chart untuk distribusi status pegawai
- `BarChart` -- Bar chart untuk distribusi per unit/jabatan
- `DetailContainer` -- Expandable detail di bawah chart

**Common/Shared:**
- `LoadingSpinner` -- Loading indicator
- `Toaster` -- Toast notification system
- `SearchInput` -- Input pencarian dengan debounce
- `FilterBar` -- Bar filter multi-kriteria
- `Pagination` -- Komponen pagination (sebelumnya, halaman, selanjutnya)
- `Breadcrumb` -- Breadcrumb navigasi

### Layout Responsive

```
DESKTOP (>=1280px):
+------------------------------------------------------------+
| SIDEBAR (256px)  |        MAIN CONTENT                     |
|                  |                                          |
| [Logo]           | [Breadcrumb + Title + Actions]           |
| [Menu Items]     |                                          |
|   Dashboard      | [Content Area - max-width: 1200px]       |
|   Karyawan       |                                          |
|     > Daftar     |                                          |
|     > Tambah     |                                          |
|   Import/Export  |                                          |
|   Users          |                                          |
|                  |                                          |
| [User Info]      |                                          |
| [Logout]         |                                          |
+------------------------------------------------------------+

TABLET (768px - 1279px):
+----------------------------------------+
| [Hamburger] [Logo]        [User]       |
+----------------------------------------+
|                                        |
| MAIN CONTENT (full-width, padded)      |
| Sidebar menjadi overlay saat hamburger |
| diklik                                 |
|                                        |
| DataTable: horizontal scroll jika      |
| kolom terlalu banyak                   |
|                                        |
+----------------------------------------+

MOBILE (<768px):
+--------------------------+
| [Menu] [Logo]    [User]  |
+--------------------------+
|                          |
| MAIN CONTENT             |
| (full-width, compact)    |
|                          |
| Cards: 1 kolom           |
| Table: card view/scroll  |
|                          |
+--------------------------+
```

### Spacing System

| Token | Value | Penggunaan |
|-------|-------|-----------|
| `space-1` | 4px | Micro gap (ikon-teks, badge padding) |
| `space-2` | 8px | Tight gap (antar item inline, input padding vertical) |
| `space-3` | 12px | Compact (padding card kecil) |
| `space-4` | 16px | Default (padding card, gap grid, input padding horizontal) |
| `space-5` | 20px | Comfortable gap |
| `space-6` | 24px | Section padding |
| `space-8` | 32px | Section gap |
| `space-10` | 40px | Large section gap |
| `space-12` | 48px | Page section gap |

### Sidebar Menu Structure

```
[Logo Gapura Angkasa]

Dashboard                    (ikon: LayoutDashboard)
Management Karyawan          (ikon: Users, ada submenu)
  > Daftar Karyawan          (ikon: List)
  > Tambah Karyawan          (ikon: UserPlus) -- admin+ only
Import & Export              (ikon: FileSpreadsheet, ada submenu)
  > Import Excel             (ikon: Upload) -- admin+ only
  > Export Excel             (ikon: Download)
  > Riwayat Import           (ikon: History) -- admin+ only
Management User              (ikon: Shield) -- super_admin only
Activity Log                 (ikon: ScrollText)

---
[User Avatar + Nama + Role]
[Tombol Logout]
```

---

# G. ATURAN CODING

## Prinsip Umum

1. **Bahasa Kode**: Semua nama variabel, fungsi, class, file, folder, comment, commit message dalam **Bahasa Inggris**
2. **Bahasa User-Facing**: Semua string yang ditampilkan ke user dalam **Bahasa Indonesia**
3. **Comment**: Tambahkan comment secukupnya untuk menjelaskan FUNGSI blok kode, bukan cara kerjanya per baris
4. **Tidak ada emoji**: Nol emoji di dalam source code (comment, variabel, string, JSX). Gunakan Lucide React icons sebagai gantinya
5. **TypeScript Strict**: `strict: true` di tsconfig.json. Tidak ada `any` tanpa justifikasi eksplisit
6. **Tidak ada console.log di production**: Hanya gunakan logger utility

## Konvensi Penamaan

| Jenis | Konvensi | Contoh |
|-------|---------|--------|
| File/Folder | kebab-case | `employee-table.tsx`, `use-employees.ts` |
| React Component | PascalCase | `EmployeeTable`, `StatCard`, `FilterBar` |
| Function/Variable | camelCase | `getEmployees`, `totalCount`, `isLoading` |
| Constant | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `ITEMS_PER_PAGE` |
| Type/Interface | PascalCase | `Employee`, `CreateEmployeeInput`, `DashboardStats` |
| Database Column | snake_case | `created_at`, `nama_lengkap`, `status_pegawai` |
| CSS Variable | kebab-case | `--color-primary`, `--radius` |
| API Route | kebab-case | `/api/employees`, `/api/activity-logs` |
| Environment Variable | UPPER_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

## Struktur File & Import

### Struktur Folder Project

```
src/
  app/                          # Next.js App Router
    (auth)/                     # Route group: halaman tanpa sidebar
      login/page.tsx
    (dashboard)/                # Route group: halaman dengan sidebar
      dashboard/page.tsx
      employees/
        page.tsx                # Daftar karyawan
        create/page.tsx         # Form tambah
        [id]/
          page.tsx              # Detail karyawan
          edit/page.tsx         # Form edit
      import/page.tsx
      export/page.tsx
      users/page.tsx            # Super admin only
      activity-logs/page.tsx
    api/                        # API Routes
      auth/
      employees/
      users/
      dashboard/
      import/
      export/
      organizations/
      activity-logs/
    layout.tsx
    globals.css
  components/
    layout/                     # AppShell, Sidebar, TopBar
    employees/                  # EmployeeTable, EmployeeForm, etc.
    dashboard/                  # StatCard, Charts, etc.
    import-export/              # ImportWizard, ExportDialog
    users/                      # UserTable, UserForm
    ui/                         # shadcn/ui components
    shared/                     # LoadingSpinner, EmptyState, etc.
  lib/
    supabase/
      client.ts                 # Browser client
      server.ts                 # Server client
      middleware.ts              # Auth middleware helper
    db/
      schema.ts                 # Drizzle schema
      migrations/
    validations/
      employee.ts               # Zod schemas
      user.ts
      import.ts
    utils/
      date.ts                   # Date formatting (WITA)
      excel.ts                  # SheetJS helpers
      format.ts                 # Number/string formatting
      logger.ts
    constants/
      enums.ts                  # All enum options as arrays
      routes.ts                 # Route paths
  hooks/
    use-employees.ts            # TanStack Query hooks
    use-dashboard.ts
    use-auth.ts
    use-debounce.ts
  stores/
    sidebar-store.ts            # Zustand stores
    filter-store.ts
  types/
    employee.ts
    user.ts
    api.ts
    database.ts
```

### Urutan Import

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal libraries/utils
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';

// 4. Components
import { DataTable } from '@/components/employees/data-table';
import { Button } from '@/components/ui/button';

// 5. Hooks & Stores
import { useEmployees } from '@/hooks/use-employees';

// 6. Types
import type { Employee, CreateEmployeeInput } from '@/types/employee';

// 7. Constants
import { STATUS_PEGAWAI_OPTIONS } from '@/lib/constants/enums';
```

## Pola React Component

```typescript
// Contoh: components/employees/employee-table.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';

import type { Employee } from '@/types/employee';

interface EmployeeTableProps {
  employees: Employee[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function EmployeeTable({
  employees,
  pagination,
  onPageChange,
  isLoading = false,
  className,
}: EmployeeTableProps) {
  const router = useRouter();

  // Component logic here

  return (
    <div className={cn('rounded-lg border bg-white', className)}>
      {/* Table content */}
    </div>
  );
}
```

## Pola Server Action / API Route

```typescript
// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { employeeListSchema } from '@/lib/validations/employee';
import { logActivity } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Sesi tidak valid' } },
        { status: 401 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Query data
    // ...

    return NextResponse.json({ success: true, data: { employees, pagination } });
  } catch (error) {
    console.error('[API] GET /api/employees:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server' } },
      { status: 500 }
    );
  }
}
```

## Error Handling

```typescript
// Semua API route menggunakan try-catch dengan format response konsisten
// Format error: { success: false, error: { code: string, message: string } }

// Error codes:
// UNAUTHORIZED - Tidak login
// FORBIDDEN - Tidak punya akses (role)
// NOT_FOUND - Resource tidak ditemukan
// VALIDATION_ERROR - Input tidak valid
// DUPLICATE_ENTRY - NIP/NIK sudah ada
// INTERNAL_ERROR - Server error
```

## Date & Timezone Handling

```typescript
// SEMUA tanggal disimpan di database sebagai TIMESTAMPTZ (UTC)
// Di frontend, selalu konversi ke WITA (Asia/Makassar) untuk display

// lib/utils/date.ts
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Makassar';

export function formatDateWITA(date: string | Date, formatStr = 'dd/MM/yyyy'): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(parsed, TIMEZONE);
  return format(zonedDate, formatStr, { locale: id });
}

export function formatDateTimeWITA(date: string | Date): string {
  return formatDateWITA(date, 'dd/MM/yyyy HH:mm') + ' WITA';
}
```

## Aturan Commit Message

Format: `<type>(<scope>): <description>`

| Type | Deskripsi |
|------|-----------|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `refactor` | Refactor tanpa perubahan behavior |
| `style` | Perubahan formatting/styling |
| `docs` | Dokumentasi |
| `test` | Test |
| `chore` | Maintenance (dependency, config) |
| `perf` | Optimisasi performa |

Contoh:
```
feat(employees): implement multi-section create form with validation
fix(import): handle Excel date serial number conversion
refactor(dashboard): extract chart components into separate files
style(sidebar): adjust menu item spacing and active state color
chore(deps): update @tanstack/react-query to v5.62
```

## Environment Variables

```bash
# .env.local (JANGAN commit ke git)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Kelola SDM Gapura Angkasa
NEXT_PUBLIC_TIMEZONE=Asia/Makassar
```

---

# RINGKASAN KEPUTUSAN KUNCI

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| Framework | Next.js 15 App Router | RSC, Server Actions, ekosistem terbesar, type-safe end-to-end |
| Database | Supabase PostgreSQL | All-in-one (DB + Auth + Storage + RLS), free tier generous |
| ORM | Drizzle ORM | Type-safe, edge-compatible, lebih ringan dari Prisma |
| Styling | Tailwind CSS 4 + shadcn/ui | Rapid development, DataTable & Form components mature |
| Excel | SheetJS (xlsx) | Library paling mature untuk Excel processing di JS |
| Charts | Recharts | Composable, responsif, cocok untuk dashboard statistik |
| State | Zustand + TanStack Query | Client state (Zustand) + server state (TanStack Query) |
| Font | Figtree | Clean, professional, sudah teruji di versi Laravel |
| Warna Utama | Putih + #439454 (Hijau) | Konsisten dengan branding existing, corporate feel |
| Deployment | Vercel | Native Next.js, preview deploys, CDN |
| Auth | Supabase Auth via NIP + password | NIP sebagai username, password default = NIP. Akun auto-create saat import |
| Data Structure | Flat employee table | Mengikuti project Laravel, memudahkan import CSV/Excel seamless |
| Timezone | Asia/Makassar (WITA) | Lokasi operasional di Bali |

---

> **Dokumen ini adalah source of truth untuk project Kelola SDM Gapura Angkasa. Setiap keputusan teknis, struktur database, dan aturan coding di sini menjadi acuan saat development dimulai. Versi: 1.2 — Validated terhadap CSV aktual (1414 karyawan, 45 kolom). Field database, enum constants, dan import mapping sudah di-cross-check dengan data real.**
