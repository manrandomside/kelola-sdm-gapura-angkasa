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
- [ ] Monitoring kontrak: cron job auto update status Non Aktif
- [x] Monitoring kontrak: badge sisa kontrak di detail karyawan
- [ ] Monitoring kontrak: stat card "Kontrak Akan Berakhir" di dashboard
- [ ] Multi Super Admin: field provider di tabel user
- [ ] Multi Super Admin: filter query berdasarkan provider
- [ ] Multi Super Admin: update RLS policy
- [ ] Multi Super Admin: seed 10 akun Super Admin per provider
- [ ] Multi Super Admin: UI user management update
- [ ] Responsive: tablet layout
- [ ] Responsive: mobile layout
- [ ] Loading states (skeleton/spinner)
- [ ] Empty states with illustration
- [ ] Toast notifications improvement
- [ ] Error boundaries
- [ ] Change password page
- [ ] GitHub Actions: Supabase keep-alive cron

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
