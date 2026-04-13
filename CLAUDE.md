# CLAUDE.md — Kelola SDM Gapura Angkasa

Sistem Manajemen Data SDM internal PT Gapura Angkasa (ground handling, Bandar Udara Ngurah Rai, Bali). 1414 karyawan, 45 field. Login via NIP, import-first architecture.

> Spec lengkap: `PROJECT_INSTRUCTIONS.md` (v1.2)

---

## Referensi File

- Full spec lengkap: `docs/PROJECT_INSTRUCTIONS.md`
- Data CSV karyawan (referensi field & format): `docs/data/employee-sample.csv`
- SELALU baca `docs/PROJECT_INSTRUCTIONS.md` jika butuh detail database schema, API endpoints, atau user flow
- SELALU baca CSV sample sebelum mengerjakan fitur import/export untuk memahami format data aktual (format tanggal campuran, inkonsistensi enum, field kosong, dll)

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui + Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| ORM | Drizzle ORM |
| Validation | Zod |
| State | Zustand (client) + TanStack Query v5 (server) |
| Excel | SheetJS (xlsx) |
| Charts | Recharts |
| Icons | Lucide React |
| Font | Figtree (300-800) |
| Deployment | Vercel |
| Timezone | Asia/Makassar (WITA / UTC+8) |

---

## Aturan Penting

1. **Login = NIP + password**. Password default = NIP. Tidak ada Google OAuth. Akun auto-create saat import
2. **3 Role**: `super_admin` (full + user mgmt), `admin` (CRUD karyawan + import), `staff` (read-only + export)
3. **Import adalah fitur KRITIS** — data harus tampil SEMPURNA, 0 data hilang. NIP duplikat = UPDATE, NIP baru = INSERT + auto-create akun
4. **Flat employee table** — semua field di 1 tabel, tidak ada child table (keluarga/pendidikan/jabatan terpisah)
5. **Bahasa kode: English**. Bahasa UI: **Bahasa Indonesia**
6. **Tidak ada emoji** di source code (comment, variable, string, JSX)
7. **TypeScript strict** — tidak ada `any` tanpa justifikasi
8. **Timezone**: semua timestamp simpan UTC, tampilkan WITA
9. **Tidak ada dark mode** — aplikasi internal kantor
10. **CSV data memiliki inkonsistensi** — normalisasi saat import (lihat bagian Data Normalization)

---

## Database Schema (Key Tables)

### `user` (login via NIP)
```
id UUID PK, supabase_auth_id UUID UNIQUE, nip VARCHAR(30) UNIQUE NOT NULL,
email VARCHAR(255), full_name VARCHAR(200) NOT NULL, role VARCHAR(20) DEFAULT 'staff',
status VARCHAR(20) DEFAULT 'active', employee_id BIGINT FK->employee, last_login_at TIMESTAMPTZ,
provider VARCHAR(100)             -- BARU (lihat Penambahan 6): NULL/Gapura = akses semua, lainnya = scoped
```

### `employee` (flat, 45+ fields, TABEL UTAMA)
```
id BIGSERIAL PK, no INT, nip VARCHAR(30) UNIQUE NOT NULL, nik VARCHAR(20) UNIQUE,
nama_lengkap VARCHAR(200) NOT NULL, jenis_kelamin VARCHAR(10), tempat_lahir, tanggal_lahir DATE,
usia INT, alamat TEXT, kota_domisili, handphone, email VARCHAR(255) UNIQUE,

status_pegawai VARCHAR(50),       -- 'PEGAWAI TETAP' | 'PKWT' | 'TAD' (lihat Revisi 2)
status_kontrak VARCHAR(50),       -- 'PEGAWAI TETAP' | 'PKWT' | 'PAKET SDM' | 'PAKET PEKERJAAN'
status_kerja VARCHAR(20),         -- 'Aktif' | 'Non Aktif' | 'Pensiun' | 'Mutasi'
provider VARCHAR(100),            -- 10 providers
lokasi_kerja DEFAULT 'Bandar Udara Ngurah Rai', cabang DEFAULT 'DPS',

kode_organisasi VARCHAR(10),      -- MO/ME/MF/MS/MU/MK/MQ/MB/EGM/GM
unit_organisasi VARCHAR(50),      -- Airside/Landside/GSE/GH/Back Office/Ancillary/Avsec/EGM/GM
nama_organisasi VARCHAR(200), sub_unit_organisasi VARCHAR(200),
unit_id BIGINT FK, sub_unit_id BIGINT FK,
nama_jabatan VARCHAR(200), jabatan VARCHAR(200),
kelompok_jabatan VARCHAR(100),    -- 7 options (STAFF/SUPERVISOR/MANAGER/etc)
kelas_jabatan, unit_kerja_kontrak, grade, kategori_karyawan,

tmt_mulai_kerja DATE, tmt_berakhir_kerja DATE, tmt_mulai_jabatan DATE,
tmt_akhir_jabatan DATE, tmt_berakhir_jabatan DATE, tmt_pensiun DATE,
masa_kerja VARCHAR, masa_kerja_bulan VARCHAR, masa_kerja_tahun VARCHAR,

pendidikan, pendidikan_terakhir, instansi_pendidikan, jurusan,
remarks_pendidikan, tahun_lulus INT,
no_bpjs_kesehatan, no_bpjs_ketenagakerjaan,
height INT, weight INT, jenis_sepatu, ukuran_sepatu, seragam,
organization_id INT FK, status DEFAULT 'active'
```

### `organization`
```
id SERIAL PK, kode_organisasi VARCHAR(10) UNIQUE, nama_organisasi VARCHAR(200),
unit_organisasi VARCHAR(50), parent_id INT FK->self, is_active BOOLEAN
```

### `unit` + `sub_unit` (cascading dropdown)
```
unit: id BIGSERIAL PK, unit_organisasi, kode, nama, is_active
sub_unit: id BIGSERIAL PK, unit_id BIGINT FK->unit, nama, kode, is_active
```

### `activity_log`
```
id UUID PK, user_id FK, user_email, user_name, activity VARCHAR, description TEXT,
target_type, target_id, target_label, metadata JSONB, ip_address, created_at
```

### `import_log`
```
id UUID PK, user_id FK, file_name, total_rows, success_count, error_count,
skipped_count, error_details JSONB, status, started_at, completed_at
```

---

## Data Normalization (Saat Import)

CSV memiliki inkonsistensi yang HARUS di-handle:

| Field | Masalah | Solusi |
|-------|---------|--------|
| `unit_organisasi` | Casing campur: `AIRSIDE`/`Airside`/`BACK OFFICE`/`Back Office`/`Back office` | Normalisasi ke Title Case via lookup map |
| `status_kerja` | `Non Aktif` (spasi) | Simpan as-is, jangan ubah ke `Non-Aktif` |
| `kelompok_jabatan` | `ACCOUNT EXECUTIVE / AE` (spasi di slash) | Simpan as-is |
| Tanggal | Format campur: `DD/MM/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY` | Parse semua format, simpan ISO |
| Nilai `-` atau `?` | Bukan data valid | Convert ke NULL |
| Provider | `PT Graha Humanindo Manajemen` (ejaan baru) | Gunakan ejaan dari CSV |
| `kode_organisasi` | Hanya terisi 62% | Nullable, jangan gagalkan import |

---

## API Endpoints (Ringkas)

### Auth
```
POST /api/auth/login          { nip, password } -> { user, session }
POST /api/auth/logout         -> { message }
GET  /api/auth/session        -> { user, role }
POST /api/auth/change-password { current_password, new_password }
```

### Users (super_admin only)
```
GET    /api/users              ?page&limit
POST   /api/users              { nip, full_name, password, role }
GET    /api/users/[id]
PUT    /api/users/[id]         { role?, status? }
DELETE /api/users/[id]         (deactivate)
POST   /api/users/[id]/reset-password  (reset ke NIP)
```

### Employees
```
GET    /api/employees          ?page&limit&search&status_pegawai&status_kontrak&unit_organisasi&provider&status_kerja&sort&order
POST   /api/employees          { ...employeeData }
GET    /api/employees/[id]     (detail lengkap)
PUT    /api/employees/[id]     { ...employeeData }
DELETE /api/employees/[id]
GET    /api/employees/validate/nip/[nip]
GET    /api/employees/validate/nik/[nik]
```

### Import/Export
```
GET  /api/import/template      -> file .xlsx
POST /api/import/preview       FormData { file } -> { rows[], valid_count, error_count }
POST /api/import/execute       { rows } -> { success_count, error_count, accounts_created }
GET  /api/import/logs
POST /api/export               { filter?, columns? } -> file .xlsx
```

### Dashboard
```
GET /api/dashboard/statistics  -> { total, pegawaiTetap, pkwt, tad, aktif, nonAktif } (lihat Revisi 2)
GET /api/dashboard/charts      -> { statusKontrak[], unitOrganisasi[], provider[], jenisKelamin[], usia[], kelompokJabatan[], statusPerUnit[] } (lihat Revisi 3)
GET /api/dashboard/activities  -> { activities[] }
```

### Rekap SDM (BARU - lihat Penambahan 4)
```
GET  /api/rekap-sdm            -> { data[], summary }
POST /api/rekap-sdm/export     -> file .xlsx
```

### Monitoring Kontrak (BARU - lihat Penambahan 5)
```
POST /api/cron/update-contract-status  -> { updated_count, details[] }
```

### Organization & Units
```
GET  /api/organizations
GET  /api/units                ?unit_organisasi=Airside
GET  /api/units/[id]/sub-units
```

---

## Design System

**Colors**: Primary `#439454`, Hover `#3a8249`, Light `#e8f5e9`, Dark `#2d5a37`, Foreground `#FFFFFF`. Background `#F9FAFB`, Surface `#FFFFFF`, Text `#111827`, Muted `#6B7280`, Border `#E5E7EB`. Success `#22C55E`, Error `#EF4444`, Warning `#F59E0B`, Info `#3B82F6`.

**Font**: Figtree — semua teks. Page title 700-800/24-30px, Heading 600-700/18-22px, Body 400-500/14-16px, Small 400/12-13px, Table 600(header)/400(body)/13-14px.

**Spacing**: 4/8/12/16/20/24/32/40/48px. Card padding 16px, Section gap 32px, Page gap 48px.

**Radius**: `0.75rem` default. Cards `rounded-xl`, Buttons `rounded-xl`, Inputs `rounded-lg`.

**Status Badges**: Aktif `green-500`, Non Aktif `red-500`, Pensiun `gray-500`, Mutasi `amber-500`. Pegawai Tetap `blue-500`, TAD `violet-500`.

---

## Coding Rules

### Naming
```
File/Folder:    kebab-case        employee-table.tsx, use-employees.ts
Component:      PascalCase        EmployeeTable, StatCard
Function/Var:   camelCase         getEmployees, isLoading
Constant:       UPPER_SNAKE       MAX_FILE_SIZE, ITEMS_PER_PAGE
Type/Interface: PascalCase        Employee, CreateEmployeeInput
DB Column:      snake_case        nama_lengkap, status_pegawai
API Route:      kebab-case        /api/activity-logs
Env Var:        UPPER_SNAKE       NEXT_PUBLIC_SUPABASE_URL
```

### Import Order
```typescript
// 1. React/Next.js
// 2. External libraries (@tanstack, zod, lucide-react)
// 3. Internal libs (@/lib/*)
// 4. Components (@/components/*)
// 5. Hooks & Stores (@/hooks/*, @/stores/*)
// 6. Types (import type)
// 7. Constants (@/lib/constants/*)
```

### Component Pattern
```typescript
// Function declaration (bukan arrow) untuk export
export function EmployeeTable({ employees, isLoading }: EmployeeTableProps) {
  // 1. Hooks di atas
  // 2. Logic di tengah
  // 3. Return JSX di bawah
}
```

### Commit Format
```
<type>(<scope>): <description>
feat(import): implement Excel preview with row validation
fix(auth): handle NIP login with leading zeros
refactor(dashboard): extract chart into separate components
```

---

## Folder Structure

```
src/
  app/
    page.tsx                        # Landing page (public)
    (auth)/login/page.tsx
    (dashboard)/
      dashboard/page.tsx
      employees/
        page.tsx                    # daftar
        create/page.tsx
        [id]/page.tsx               # detail
        [id]/edit/page.tsx
      rekap-sdm/page.tsx              # BARU (Penambahan 4)
      import/page.tsx
      export/page.tsx
      users/page.tsx                # super_admin only
      activity-logs/page.tsx
    api/
      auth/login/route.ts
      auth/logout/route.ts
      auth/session/route.ts
      employees/route.ts            # GET (list), POST (create)
      employees/[id]/route.ts       # GET, PUT, DELETE
      users/route.ts
      users/[id]/route.ts
      dashboard/statistics/route.ts
      dashboard/charts/route.ts
      import/template/route.ts
      import/preview/route.ts
      import/execute/route.ts
      export/route.ts
      rekap-sdm/route.ts            # BARU (Penambahan 4)
      rekap-sdm/export/route.ts     # BARU (Penambahan 4)
      cron/update-contract-status/route.ts  # BARU (Penambahan 5)
      organizations/route.ts
      units/route.ts
      units/[id]/sub-units/route.ts
    layout.tsx
    globals.css
  components/
    layout/                         # AppShell, Sidebar, TopBar
    employees/                      # EmployeeTable, EmployeeForm, EmployeeDetail
    dashboard/                      # StatCard, DonutChart, BarChart
    import-export/                  # ImportWizard, ExportDialog
    rekap-sdm/                      # RekapTable (BARU)
    users/                          # UserTable, UserForm
    ui/                             # shadcn/ui
    shared/                         # LoadingSpinner, EmptyState, StatusBadge, SearchInput
  lib/
    supabase/client.ts, server.ts, middleware.ts
    db/schema.ts, migrations/
    validations/employee.ts, user.ts, import.ts
    utils/date.ts, excel.ts, format.ts, logger.ts
    constants/enums.ts, routes.ts
  hooks/
    use-employees.ts, use-dashboard.ts, use-auth.ts, use-debounce.ts
  stores/
    sidebar-store.ts, filter-store.ts
  types/
    employee.ts, user.ts, api.ts, database.ts
```

---

## Priority Phases

### Phase 1: Foundation
- Supabase project setup (PostgreSQL + Auth + Storage)
- Drizzle schema + migrations (semua tabel)
- Next.js project scaffold + Tailwind + shadcn/ui
- Auth (NIP + password login/logout)
- Layout (AppShell + Sidebar + TopBar)
- Seed unit + sub_unit + organization data

### Phase 2: Core CRUD
- Employee list (DataTable + server-side pagination + search + filter)
- Employee create (multi-section form + cascading dropdown)
- Employee detail (Show page + tab sections)
- Employee edit
- Employee delete (with confirmation)

### Phase 3: Import/Export (KRITIS)
- Download template Excel
- Import preview + validation + normalization
- Import execute + auto-create user accounts
- Export Excel with filter + styling
- Import log history

### Phase 4: Dashboard & Supporting
- Dashboard statistics cards
- Charts (status kontrak, unit organisasi, provider)
- Activity log (list + detail)
- User management (super_admin CRUD)

### Phase 5: Polish
- Responsive design (tablet/mobile)
- Loading states + empty states
- Error handling + toast notifications
- Change password feature
- Performance optimization (indexes, query tuning)

---

### Deployment

| Item | Detail |
|------|--------|
| Hosting | Vercel (Hobby/Free) |
| URL Production | https://kelola-sdm-gapura-angkasa.vercel.app |
| Auto-deploy | Ya, setiap push ke branch main |
| Database | Supabase (Singapore region) |
| Login Super Admin | NIP: SUPERADMIN, Password: SUPERADMIN |

---

## Status Progress

### Phase 1: Foundation
- [x] Supabase project created + env configured
- [x] Drizzle schema: user table
- [x] Drizzle schema: employee table (45+ fields)
- [x] Drizzle schema: organization, unit, sub_unit
- [x] Drizzle schema: activity_log, import_log, app_setting
- [x] Drizzle migrations executed
- [x] Next.js project initialized + Tailwind 4 + shadcn/ui
- [x] AppShell layout (Sidebar + TopBar)
- [x] Auth: login page (NIP + password)
- [x] Auth: session check + role-based redirect
- [x] Auth: logout
- [x] Seed: unit + sub_unit data
- [x] Seed: organization data
- [x] Seed: initial super_admin account

### Phase 2: Core CRUD
- [x] Employee list page (DataTable + pagination)
- [x] Server-side search (nama/NIP/NIK)
- [x] Multi-filter (status_pegawai, status_kontrak, unit_organisasi, provider, status_kerja)
- [x] Employee create form (4 tab sections)
- [x] Cascading dropdown (unit_organisasi -> unit -> sub_unit)
- [x] NIP uniqueness check (realtime)
- [x] Employee detail page (Show)
- [x] Employee edit page
- [x] Employee delete + confirmation dialog
- [x] Activity log: record CRUD operations

### Phase 3: Import/Export
- [x] Import: download template .xlsx
- [x] Import: file upload (drag & drop)
- [x] Import: parse CSV/XLSX via SheetJS
- [x] Import: preview table with validation
- [x] Import: data normalization (unit_organisasi casing, dates, null values)
- [x] Import: execute (insert/update employees)
- [x] Import: auto-create user accounts (NIP = password)
- [x] Import: error report (per-row detail)
- [x] Import: progress indicator
- [x] Import: log history page
- [x] Export: Excel with current filters
- [x] Export: styled header (green #439454, white text)

### Phase 4: Dashboard & Supporting
- [x] Dashboard: statistics cards (total, breakdown by status_kontrak)
- [x] Dashboard: donut chart (status kontrak)
- [x] Dashboard: bar chart (unit organisasi)
- [x] Dashboard: bar chart (provider)
- [x] Dashboard: recent activities
- [x] Activity log page (list + filter + pagination)
- [x] User management: list users
- [x] User management: create user
- [x] User management: edit role/status
- [x] User management: reset password to NIP

### Phase 5: Polish & Revisions
- [x] Revisi: Label tab "Fisik & Seragam" -> "Data Seragam"
- [x] Revisi: PKWT bukan TAD (status_pegawai 3 nilai, update enum, dashboard, filter, import logic)
- [x] Revisi: Update data existing di DB (status_pegawai PKWT) — migration endpoint ready: POST /api/migrations/fix-pkwt
- [x] Dashboard: chart Jenis Kelamin (pie/donut)
- [x] Dashboard: chart Komposisi Usia SDM (bar)
- [x] Dashboard: chart Kelompok Jabatan (bar)
- [x] Dashboard: chart Pegawai Tetap & PKWT & TAD per Unit Organisasi (stacked bar)
- [x] Dashboard: rekap SDM per jabatan (pivot table ringkas)
- [x] Halaman baru: Rekap SDM (/rekap-sdm) -- pivot table lengkap + sort + search + export
- [x] Monitoring kontrak: color coding di daftar karyawan
- [x] Monitoring kontrak: tab Aktif / Akan Berakhir / Sudah Berakhir
- [x] Monitoring kontrak: cron job auto update status Non Aktif
- [x] Monitoring kontrak: badge sisa kontrak di detail karyawan
- [x] Monitoring kontrak: stat card "Kontrak Akan Berakhir" di dashboard
- [x] Multi Super Admin: field provider di tabel user
- [x] Multi Super Admin: filter query berdasarkan provider
- [x] Multi Super Admin: update RLS policy
- [x] Multi Super Admin: seed 10 akun Super Admin per provider
- [x] Multi Super Admin: UI user management update
- [x] GitHub Actions: Supabase keep-alive cron
- [x] Revisi: Chart Distribusi Status Kontrak dari donut ke bar chart

### Phase 6: UI/UX Enhancement & Revisi
- [x] Revisi: Stat card "Kontrak Akan Berakhir" -- reword label lebih jelas + perbaiki ukuran card agar konsisten
- [x] Revisi: Chart warna monoton -- Karyawan per Unit Organisasi, Karyawan per Provider, Kelompok Jabatan diubah dari hijau semua menjadi warna-warni
- [x] Revisi: Dashboard aktivitas terbaru -- hide aktivitas login/logout, hanya tampilkan create/update/delete/import/export
- [x] Revisi: Tab "Sudah Berakhir" -- tambah info breakdown (Non Aktif + Kontrak Lewat) agar tidak ambigu
- [x] Revisi: Template Import Excel -- redesign sesuai format spreadsheet (header hijau, sub-header keterangan, urutan kolom sama persis, informasi panduan per kolom)
- [x] Revisi: Template Export Excel -- samakan format dengan import (header hijau, styling profesional), fix padding/layout halaman export
- [x] Enhancement: Export pilih SDM -- tambah checkbox di tabel karyawan untuk memilih karyawan tertentu yang akan di-export
- [ ] Polish: Responsive tablet layout
- [ ] Polish: Responsive mobile layout
- [ ] Polish: Loading states (skeleton/spinner)
- [ ] Polish: Empty states with illustration
- [ ] Polish: Toast notifications improvement
- [ ] Polish: Error boundaries
- [ ] Polish: Change password page

### Phase 7: UI/UX Improvement & Landing Page

#### Landing Page & Glass UI
- [x] Landing page: halaman baru di route / (hero, fitur, info perusahaan, footer, tombol Masuk)
- [x] Subtle glass UI: terapkan di dashboard (stat cards, card chart) dan sidebar — bukan full glassmorphism, hanya subtle (backdrop-blur, semi-transparan)

#### Dashboard Improvements
- [x] Tooltip info di Breakdown TAD — ikon info (?) di card Paket SDM dan Paket Pekerjaan dengan penjelasan: "Karyawan TAD yang dikontrak melalui paket SDM" / "Karyawan TAD yang dikontrak melalui paket pekerjaan"
- [x] Persentase di stat card Non Aktif — tampilkan "236 (18.5%)" agar terlihat proporsi terhadap total
- [x] Rekap SDM summary di dashboard — tambah subtitle: "Menampilkan 10 jabatan terbanyak"

#### Daftar Karyawan Improvements
- [ ] Tab "Semua" — tambah keterangan "(termasuk non-aktif)" agar tidak ambigu
- [ ] Klik row — pastikan klik di mana saja pada baris langsung navigasi ke detail karyawan (bukan hanya tombol aksi)

#### Detail Karyawan Improvements
- [ ] Breadcrumb — ganti "Detail" menjadi nama karyawan. Contoh: "Beranda > Daftar Karyawan > A.A GEDE AGUNG WIRAJAYA"
- [ ] Hapus duplicate breadcrumb — pastikan hanya ada 1 breadcrumb di halaman
- [ ] Tab Data Seragam — jika semua field kosong (jenis sepatu, ukuran sepatu, seragam semua NULL), tampilkan pesan "Belum ada data seragam" daripada 5 baris tanda "-"

#### Form Karyawan (Create & Edit) Improvements
- [ ] Indikator tab — dot hijau/merah di label tab untuk menunjukkan tab mana yang sudah diisi dan mana yang belum/ada error
- [ ] Lokasi Kerja & Cabang — buat readonly/disabled karena selalu "Bandar Udara Ngurah Rai" dan "DPS", dengan visual muted agar user tidak bingung
- [ ] Redirect setelah save — setelah berhasil simpan, redirect ke halaman detail karyawan (bukan ke daftar karyawan)

#### Rekap SDM Improvements
- [x] Stat card konteks — tambah subtitle "dari X karyawan aktif" di samping atau bawah angka Total Jabatan
- [x] Grand Total sticky — baris Grand Total di tabel selalu terlihat saat scroll (sticky bottom)
- [x] Export button label — ubah menjadi "Export Excel (.xlsx)" agar jelas formatnya

#### Import Improvements
- [ ] Visual step indicator — tampilkan progress bar/step di atas (Step 1: Upload, Step 2: Preview, Step 3: Import) agar user tahu posisi mereka
- [ ] Summary lebih actionable — setelah import selesai, tampilkan tombol yang jelas: "Lihat Detail Error", "Import Ulang", "Lihat Data Karyawan"
- [ ] Info auto-create akun — tampilkan informasi "Setiap karyawan yang berhasil di-import otomatis mendapat akun login (NIP = password)" dengan highlight/card yang jelas, bukan teks biasa

#### Riwayat Import Improvements
- [ ] Auto-refresh atau button refresh — untuk status "Berjalan" yang stuck, tambahkan button "Refresh Status" atau auto-refresh setiap 10 detik saat ada status Berjalan
- [ ] Kolom "Diimport Oleh" — tambahkan kolom nama user yang melakukan import

#### User Management Improvements
- [ ] Info header — tambah teks di bawah judul: "Akun dibuat otomatis saat import data karyawan. Password default = NIP."
- [ ] Last Login — jika NULL, tampilkan "Belum pernah login" (bukan "-" atau kosong)

#### Activity Log Improvements
- [ ] Filter by tipe aktivitas — dropdown filter: Semua, Create, Update, Delete, Import, Export, Login, Auto Update
- [ ] Filter by tanggal — date range picker untuk memilih rentang tanggal

#### Sidebar Improvements
- [ ] Riwayat Import — pindahkan dari sidebar ke dalam halaman Import saja (sebagai tab atau link), supaya sidebar lebih ringkas
- [ ] Hide menu berdasarkan role — role staff: sembunyikan "Tambah Karyawan" dan "Import Excel" karena tidak punya akses

---

## Revisi & Penambahan (Phase 5+)

> Daftar revisi dan fitur baru yang harus diimplementasikan. Gunakan sebagai referensi saat mengerjakan task.

### Revisi 1: Label Tab "Fisik & Seragam" -> "Data Seragam"
- Di halaman detail karyawan (`/employees/[id]`), tab terakhir yang sebelumnya bernama "Fisik & Seragam" diganti menjadi **"Data Seragam"**
- Perubahan hanya di label tab, konten tetap sama (tinggi badan, berat badan, jenis sepatu, ukuran sepatu, seragam)
- **File**: `src/app/(dashboard)/employees/[id]/page.tsx`

### Revisi 2: PKWT Bukan Bagian TAD
- **PERUBAHAN PENTING**: PKWT tidak termasuk kategori TAD
- `status_pegawai` sekarang punya **3 nilai** (sebelumnya 2):
  - `'PEGAWAI TETAP'`
  - `'PKWT'`
  - `'TAD'`
- TAD hanya mencakup 2 `status_kontrak`: `'PAKET SDM'` dan `'PAKET PEKERJAAN'`
- PKWT berdiri sendiri, bukan sub-kategori TAD
- **Mapping status_kontrak -> status_pegawai:**
  | status_kontrak | status_pegawai |
  |----------------|----------------|
  | PEGAWAI TETAP | PEGAWAI TETAP |
  | PKWT | PKWT |
  | PAKET SDM | TAD |
  | PAKET PEKERJAAN | TAD |
- **Yang harus berubah:**
  1. Enum `STATUS_PEGAWAI_OPTIONS` di `lib/constants/enums.ts`: tambah `'PKWT'`
  2. Dashboard stat cards: Total | Pegawai Tetap | PKWT | TAD | Aktif | Non Aktif
  3. Breakdown TAD hanya 2: Paket SDM, Paket Pekerjaan (PKWT tidak masuk breakdown TAD)
  4. Chart distribusi status kontrak harus mencerminkan 3 kategori
  5. Filter di employee list harus menyediakan 3 opsi `status_pegawai`
  6. Import logic: saat import CSV, mapping `status_kontrak` -> `status_pegawai` harus mengikuti aturan baru
  7. Data existing di database perlu di-update: karyawan dengan `status_kontrak='PKWT'` harus diubah `status_pegawai` dari `'TAD'` menjadi `'PKWT'`

### Revisi 3: Dashboard Charts Tambahan
- Tambahkan 4 chart baru di dashboard (total jadi **7 chart**):
  1. **Existing**: Distribusi Status Kontrak (donut) -- update untuk 3 kategori
  2. **Existing**: Karyawan per Unit Organisasi (bar)
  3. **Existing**: Karyawan per Provider (bar)
  4. **BARU**: Jenis Kelamin (pie/donut) -- L vs P dengan jumlah dan persentase
  5. **BARU**: Komposisi Usia SDM (bar chart) -- range: 18-25, 26-35, 36-45, 46-55, 56+
  6. **BARU**: Kelompok Jabatan (bar chart) -- ACCOUNT EXECUTIVE/AE, EGM, GM, MANAGER, STAFF, SUPERVISOR, NON
  7. **BARU**: Pegawai Tetap & TAD & PKWT per Unit Organisasi (stacked bar) -- breakdown 3 status per kode organisasi
- Layout harus responsive, menyesuaikan ukuran layar
- Design chart bebas tapi harus profesional dan clean

### Penambahan 4: Rekap SDM per Jabatan (Pivot Table)
- Tabel yang menampilkan jumlah SDM per Nama Jabatan, dipecah per Status Pegawai (Pegawai Tetap / PKWT / TAD) dengan kolom Grand Total
- **Ditempatkan di 2 lokasi:**
  1. **Di halaman Dashboard**: section baru di bawah charts, bisa dalam bentuk ringkas/collapsible
  2. **Halaman baru di sidebar**: di bawah menu "Management Karyawan", buat menu baru **"Rekap SDM"** (route: `/rekap-sdm`)
- **Halaman Rekap SDM** lengkap dengan:
  - Tabel pivot: baris = Nama Jabatan, kolom = Pegawai Tetap | PKWT | TAD | Grand Total
  - Bisa di-sort per kolom
  - Bisa di-search/filter
  - Bisa di-export ke Excel
- **Sidebar menu update:**
  ```
  Dashboard
  Management Karyawan
    - Daftar Karyawan (/employees)
    - Tambah Karyawan (/employees/create)
  Rekap SDM (/rekap-sdm)          <-- BARU
  Import Data (/import)
  Export Data (/export)
  Log Aktivitas (/activity-logs)
  Management User (/users)         -- super_admin only
  ```
- **API endpoint baru:**
  ```
  GET /api/rekap-sdm              -> { data: [{ nama_jabatan, pegawai_tetap, pkwt, tad, total }], summary: { pegawai_tetap, pkwt, tad, grand_total } }
  POST /api/rekap-sdm/export      -> file .xlsx
  ```
- **File baru yang perlu dibuat:**
  - `src/app/(dashboard)/rekap-sdm/page.tsx`
  - `src/app/api/rekap-sdm/route.ts`
  - `src/app/api/rekap-sdm/export/route.ts`
  - `src/components/rekap-sdm/rekap-table.tsx`
  - `src/components/dashboard/rekap-summary.tsx` (versi ringkas untuk dashboard)

### Penambahan 5: Monitoring Kontrak (Status Aktif / Akan Berakhir / Sudah Berakhir)
- Fitur monitoring masa kontrak karyawan berdasarkan `tmt_mulai_kerja` dan `tmt_berakhir_kerja`
- **Color coding** pada daftar karyawan berdasarkan sisa kontrak:
  - Hijau: kontrak masih lama (> 90 hari dari sekarang)
  - Kuning/Amber: kontrak akan berakhir (30-90 hari dari sekarang)
  - Merah: kontrak sangat dekat berakhir (< 30 hari dari sekarang)
  - Abu-abu: kontrak sudah berakhir (`tmt_berakhir_kerja` < hari ini)
- **Tab/toggle** di halaman Management Karyawan (`/employees`):
  - "Aktif" -- karyawan dengan `status_kerja = 'Aktif'` dan kontrak belum berakhir (default view)
  - "Akan Berakhir" -- karyawan yang kontraknya berakhir dalam 90 hari ke depan
  - "Sudah Berakhir" -- karyawan yang kontraknya sudah lewat / status Non Aktif
- **Auto update status (Cron Job):**
  - Scheduled job jalan setiap hari jam 00:00 WITA
  - Cek semua karyawan: jika `tmt_berakhir_kerja < hari ini` DAN `status_kerja` masih `'Aktif'`, otomatis ubah `status_kerja` menjadi `'Non Aktif'`
  - Log perubahan di `activity_log` dengan `activity = 'auto_status_update'`
  - Implementasi via: GitHub Actions cron job yang memanggil API endpoint khusus, atau Supabase pg_cron
  - Tambahkan activity type baru: `'auto_status_update'` di `ACTIVITY_TYPE_OPTIONS`
- **Detail karyawan**: tampilkan badge/indicator sisa kontrak dengan warna sesuai threshold
- **Dashboard**: tambahkan stat card "Kontrak Akan Berakhir (90 hari)" dengan jumlah
- **API endpoint baru:**
  ```
  POST /api/cron/update-contract-status   -> { updated_count, details[] }
  ```
- **File baru yang perlu dibuat:**
  - `src/app/api/cron/update-contract-status/route.ts`
  - `src/components/employees/contract-badge.tsx`

### Penambahan 6: Multi Super Admin per Provider
- Tambah field `provider` (`VARCHAR(100)`, nullable) di tabel `user`
- **Mekanisme akses:**
  - `super_admin` + provider = `'PT Gapura Angkasa'` (atau NULL) --> akses SEMUA data, CRUD semua karyawan, import/export semua
  - `super_admin` + provider = [provider lain] --> hanya bisa akses, CRUD, import/export data karyawan dari provider mereka sendiri
  - `admin` dan `staff` --> tetap seperti sekarang (untuk sekarang tidak ada provider scope)
- **Filter otomatis:**
  - Semua query karyawan (list, detail, dashboard, export) harus di-filter berdasarkan provider user yang login
  - RLS policy di tabel employee perlu di-update untuk mengecek provider user
  - Dashboard statistik hanya menampilkan data sesuai provider (kecuali Gapura yang lihat semua)
- **Seed 10 akun Super Admin** (satu per provider dari CSV):
  | NIP | Password | Provider |
  |-----|----------|----------|
  | SUPERADMIN_GAPURA | SUPERADMIN_GAPURA | PT Gapura Angkasa |
  | SUPERADMIN_AIRBOX | SUPERADMIN_AIRBOX | PT Air Box Personalia |
  | SUPERADMIN_FINFLEET | SUPERADMIN_FINFLEET | PT Finfleet Teknologi Indonesia |
  | SUPERADMIN_MITRA | SUPERADMIN_MITRA | PT Mitra Angkasa Perdana |
  | SUPERADMIN_GRAHA | SUPERADMIN_GRAHA | PT Graha Humanindo Manajemen |
  | SUPERADMIN_MANDALA | SUPERADMIN_MANDALA | PT Mandala Garda Nusantara |
  | SUPERADMIN_IAS | SUPERADMIN_IAS | PT IAS Support |
  | SUPERADMIN_KIDORA | SUPERADMIN_KIDORA | PT Kidora Mandiri Investama |
  | SUPERADMIN_DUTA | SUPERADMIN_DUTA | PT Duta Griya Sarana |
  | SUPERADMIN_AEROTRANS | SUPERADMIN_AEROTRANS | PT Aerotrans Wisata |
- Akun `SUPERADMIN` yang sudah ada tetap dipertahankan sebagai master super admin (provider = PT Gapura Angkasa)
- **User management**: Super Admin Gapura bisa manage semua user. Super Admin provider lain hanya bisa melihat user dari provider mereka.
- **Yang harus berubah:**
  1. Drizzle schema `user` table: tambah kolom `provider`
  2. Migration baru untuk ALTER TABLE
  3. Auth session: include `provider` di session data
  4. Semua API employee/dashboard/export: tambah WHERE filter provider
  5. Sidebar/TopBar: tampilkan nama provider yang login
  6. User management page: filter berdasarkan provider
  7. Seed script: buat 10 akun super admin

### Phase 6 Detail

#### Stat Card Kontrak
- Label diganti (opsi: "Peringatan Kontrak" / "SDM Perlu Perpanjangan" / "Kontrak Hampir Habis" -- akan ditentukan)
- Subtitle: "X karyawan akan berakhir dalam 90 hari"
- Ukuran card harus sama dengan card lain (Paket SDM, Paket Pekerjaan), tidak boleh lebih kecil/besar
- Tetap terpisah dari baris stat cards utama, posisi setelah Breakdown TAD

#### Chart Warna-Warni
- 3 chart yang saat ini hijau semua harus diubah:
  - Karyawan per Unit Organisasi: setiap unit warna berbeda
  - Karyawan per Provider: setiap provider warna berbeda
  - Kelompok Jabatan: setiap jabatan warna berbeda
- Gunakan palet warna dari design system: blue, violet, amber, pink, cyan, orange, emerald, rose, indigo, teal

#### Dashboard Aktivitas
- Di dashboard (5 item terbaru): filter OUT aktivitas login dan logout
- Hanya tampilkan: create_employee, update_employee, delete_employee, import_excel, export_excel, create_user, update_user, delete_user, update_role, auto_status_update
- Di halaman Activity Log lengkap (/activity-logs): tetap tampilkan semua termasuk login (tidak berubah)

#### Tab Sudah Berakhir -- Info Breakdown
- Di tab "Sudah Berakhir", tampilkan breakdown angka: "239 (236 Non Aktif + 3 Kontrak Lewat)"
- Atau tooltip yang menjelaskan: "Termasuk karyawan Non Aktif dan karyawan yang kontraknya sudah melewati TMT Berakhir Kerja"

#### Template Import Excel
- Redesign template agar sesuai format spreadsheet Google Sheets yang sudah ada
- Row 1: kosong atau judul
- Row 2: header dengan background hijau #439454, teks putih, bold
- Header memiliki keterangan tambahan di baris bawahnya (sub-header):
  - Lokasi Kerja: "(Bandar Udara Ngurah Rai)"
  - Cabang: "(DPS)"
  - Status Pegawai: "(PEGAWAI TETAP/PKWT/TAD)"
  - Status Kontrak: "(PEGAWAI TETAP/PAKET PEKERJAAN/PKWT/PAKET SDM)"
  - Status Kerja: "(Aktif/Non Aktif)"
  - Unit Organisasi: "(Airside, Landside, GSE, GH, Back Office, Ancillary, Avsec, EGM, GM)"
  - Kode Organisasi: "(MO/ME/MF/MS/MU/MK/MQ/MB/EGM/GM)"
  - Jenis Kelamin: "(L / P)"
  - Jenis Sepatu: "(Pantofel / Safety Shoes)"
  - TMT Mulai Kerja: "(dd/mm/yyyy)"
  - dll sesuai spreadsheet
- Urutan kolom harus sama persis dengan spreadsheet: NO, NIP, KTP/NIK, NAMA LENGKAP, LOKASI KERJA, CABANG, STATUS PEGAWAI, STATUS KONTRAK, STATUS KERJA, PROVIDER, UNIT ORGANISASI, KODE ORGANISASI, NAMA ORGANISASI, SUB UNIT ORGANISASI, NAMA JABATAN, UNIT KERJA SESUAI KONTRAK, TMT MULAI KERJA, TMT MULAI JABATAN, TMT BERAKHIR JABATAN, TMT BERAKHIR KERJA, MASA KERJA (BULAN), MASA KERJA (TAHUN), JENIS KELAMIN, JENIS SEPATU, UKURAN SEPATU, TEMPAT LAHIR, TANGGAL LAHIR, USIA, KOTA DOMISILI, ALAMAT, PENDIDIKAN, NAMA INSTANSI PENDIDIKAN, JURUSAN, REMARKS PENDIDIKAN, TAHUN LULUS, HANDPHONE, KATEGORI KARYAWAN, TMT PENSIUN, GRADE, NO BPJS KESEHATAN, NO BPJS KETENAGAKERJAAN, KELOMPOK JABATAN, KELAS JABATAN, WEIGHT, HEIGHT

#### Template Export Excel
- Format sama dengan import (header hijau, styling profesional)
- Fix padding halaman export agar konsisten dengan halaman lain
- Kolom dan urutan sama dengan template import

#### Export Pilih SDM
- Tambah kolom checkbox di tabel daftar karyawan (kolom pertama)
- Header checkbox: select all / deselect all
- Tombol Export berubah behavior:
  - Jika ada yang dicentang: "Export X Terpilih"
  - Jika tidak ada yang dicentang: "Export Semua" (atau sesuai filter aktif)
- Jumlah terpilih ditampilkan: "3 karyawan dipilih"

### Phase 7 Detail

#### Landing Page
- Route: / (root)
- Saat ini / redirect ke /login. Ubah agar / menampilkan landing page, tombol "Masuk ke Sistem" mengarah ke /login
- Konten:
  - Hero section: judul "Kelola SDM Gapura Angkasa", deskripsi singkat tentang sistem, tombol "Masuk ke Sistem"
  - Fitur section: 3-4 kartu (Manajemen Data SDM, Import/Export Excel, Dashboard Analitik, Multi-Provider Access)
  - Info perusahaan: logo Gapura Angkasa, deskripsi singkat PT Gapura Angkasa sebagai perusahaan ground handling di Bandara Ngurah Rai Bali
  - Footer: copyright, link login
- Design: clean, profesional, menggunakan warna primary #439454, font Figtree
- Responsive: harus tampil bagus di desktop, tablet, dan mobile
- Tidak perlu auth untuk akses landing page

#### Subtle Glass UI
- Terapkan HANYA di elemen tertentu, BUKAN seluruh aplikasi:
  - Dashboard stat cards: background semi-transparan + backdrop-blur
  - Card chart di dashboard: subtle glass effect
  - Sidebar: background dengan sedikit transparansi + blur
- Teknik CSS: backdrop-filter: blur(10px), background: rgba(255,255,255,0.7), border: 1px solid rgba(255,255,255,0.3)
- PENTING: readability tetap harus baik, teks harus tetap jelas terbaca
- PENTING: jika hasilnya kurang bagus, siap untuk revert ke solid background
- Jangan terapkan glass di: tabel data, form input, modal/dialog, login page

#### Sidebar Role-Based Menu
- super_admin: semua menu tampil
- admin: semua menu tampil kecuali Management User
- staff: semua menu tampil kecuali Tambah Karyawan, Import Excel, Management User
- Menu yang di-hide benar-benar tidak tampil (bukan disabled/grayed out)

---

## Catatan Teknis

> Bagian ini diisi selama development. Catat keputusan, workaround, bug fix, atau hal penting lainnya.

- Data CSV memiliki inkonsistensi yang HARUS di-handle saat import: format tanggal campuran (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY), status_pegawai 2 nilai vs status_kontrak 4 nilai, field kosong untuk pegawai non-tetap, casing tidak konsisten pada unit_organisasi

### 2026-04-09: Deployment & Production
- Vercel project: kelola-sdm-gapura-angkasa
- Production URL: https://kelola-sdm-gapura-angkasa.vercel.app
- Auto-deploy dari branch main setiap git push
- Vercel plan: Hobby (free tier, API route timeout 60 detik)
- PENTING: Import data TIDAK bisa dilakukan via production (timeout 60s untuk 1414 row). Harus import via localhost karena tidak ada timeout limit. Database Supabase sama, jadi data yang di-import via localhost langsung muncul di production.

### 2026-04-09: Supabase Configuration
- Project ID: ccmzrkelesbxdltgcnqf
- Region: Southeast Asia (Singapore)
- Auth: Email provider enabled, Confirm email disabled, semua OAuth disabled
- Site URL: https://kelola-sdm-gapura-angkasa.vercel.app
- Redirect URLs: https://kelola-sdm-gapura-angkasa.vercel.app/**, http://localhost:3000/**
- Direct DB connection (port 5432) TIDAK bisa resolve tanpa IPv4 add-on. Semua koneksi pakai pooler (DATABASE_URL port 6543)
- Login menggunakan format email proxy: {nip}@gapura.internal

### 2026-04-09: Import Data
- Import 1.414 row dari employee-sample.csv via localhost
- Hasil: 1.273 berhasil, 135 gagal (kemungkinan duplicate email/NIK constraint), 1.132 akun baru dibuat
- Untuk reset data: jalankan SQL di Supabase SQL Editor:
  DELETE FROM activity_log; DELETE FROM import_log; DELETE FROM "user" WHERE nip != 'SUPERADMIN'; DELETE FROM employee;

### 2026-04-09: Logo & PWA
- Logo file: public/images/gapuraangkasa.jpg
- PWA manifest: public/manifest.json (installable app, standalone mode)
- Favicon dan icon variants di-generate via scripts/generate-icons.mjs
- Logo ditampilkan di sidebar dan login page

### 2026-04-10: PKWT Migration
- Menjalankan migration fix-pkwt untuk update status_pegawai karyawan PKWT
- Sebelumnya: PKWT masuk kategori TAD (status_pegawai='TAD')
- Sesudah: PKWT berdiri sendiri (status_pegawai='PKWT')
- Dashboard stat cards dan chart sudah diupdate untuk 3 status_pegawai
- Charts API sekarang return statusPegawai (3 kategori) dan statusKontrak (4 kategori)
- StatCard mendukung warna baru: amber (Paket SDM) dan pink (Paket Pekerjaan)

### 2026-04-09: Known Issues
- 135 row gagal import: kemungkinan duplicate email/NIK di CSV. Perlu investigasi lebih lanjut
- Vercel Hobby timeout 60s: import bulk harus via localhost
- Button warning di console (nativeButton prop): bukan blocking, hanya warning dari shadcn/ui Base UI migration

### 2026-04-11: Cron Job & GitHub Actions
- Cron job update contract status: setiap hari jam 00:00 WITA (16:00 UTC)
- GitHub Actions workflow: `.github/workflows/cron-contract-status.yml`
- Supabase keep-alive: `.github/workflows/supabase-keepalive.yml`
- PENTING: Perlu set GitHub Secrets: `APP_URL`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- PENTING: Perlu set Vercel env: `CRON_SECRET` (sama dengan GitHub Secret)
- Endpoint cron bisa juga dipanggil manual oleh super_admin untuk testing
- Chart "Distribusi Status Kontrak" diubah dari donut ke bar chart

### 2026-04-12: Multi Super Admin per Provider
- Kolom `provider` ditambahkan di tabel `user` (VARCHAR 100, nullable)
- 10 akun super admin per provider di-seed via `POST /api/migrations/seed-provider-admins`
- Akun SUPERADMIN (master) tetap ada, provider = PT Gapura Angkasa
- Login semua akun: NIP = password (contoh: SUPERADMIN_GAPURA / SUPERADMIN_GAPURA)
- Helper `isGapuraAdmin()` dan `getProviderFilter()` dibuat di `src/lib/utils/auth.ts` untuk filter di task berikutnya
- Session/auth response sudah include field `provider`
- Migration endpoint: `POST /api/migrations/add-provider-column` (tambah kolom + set provider SUPERADMIN)
- Seed endpoint: `POST /api/migrations/seed-provider-admins` (buat 10 akun, update SUPERADMIN)

### 2026-04-12: Provider-Scoped Access (Complete)
- Semua API endpoint sudah di-filter berdasarkan provider user yang login
- Super Admin Gapura (provider = 'PT Gapura Angkasa' atau NULL) bisa akses semua data
- Super Admin provider lain hanya bisa akses data provider mereka sendiri
- Employee detail/edit/delete: return 403 jika provider tidak cocok
- Import: Super Admin provider hanya bisa import data provider mereka (provider di-force ke provider user)
- Export: Super Admin provider hanya export data provider mereka
- User management: Super Admin provider hanya manage user dari provider mereka
- User management: Super Admin provider tidak bisa assign role super_admin
- Employee form: provider auto-fill dan locked untuk Super Admin provider
- Reset password: Super Admin provider tidak bisa reset password akun super_admin lain
- NIP/NIK validation tetap global (harus unik lintas provider)
- Activity logs tidak di-filter per provider (semua bisa lihat semua log)
