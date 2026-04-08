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
status VARCHAR(20) DEFAULT 'active', employee_id BIGINT FK->employee, last_login_at TIMESTAMPTZ
```

### `employee` (flat, 45+ fields, TABEL UTAMA)
```
id BIGSERIAL PK, no INT, nip VARCHAR(30) UNIQUE NOT NULL, nik VARCHAR(20) UNIQUE,
nama_lengkap VARCHAR(200) NOT NULL, jenis_kelamin VARCHAR(10), tempat_lahir, tanggal_lahir DATE,
usia INT, alamat TEXT, kota_domisili, handphone, email VARCHAR(255) UNIQUE,

status_pegawai VARCHAR(50),       -- 'PEGAWAI TETAP' | 'TAD'
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
GET /api/dashboard/statistics  -> { total, pegawaiTetap, tad, tadPaketPekerjaan, tadPkwt, tadPaketSdm, aktif, nonAktif }
GET /api/dashboard/charts      -> { statusKontrak[], unitOrganisasi[], provider[] }
GET /api/dashboard/activities  -> { activities[] }
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
- [ ] Employee delete + confirmation dialog
- [ ] Activity log: record CRUD operations

### Phase 3: Import/Export
- [ ] Import: download template .xlsx
- [ ] Import: file upload (drag & drop)
- [ ] Import: parse CSV/XLSX via SheetJS
- [ ] Import: preview table with validation
- [ ] Import: data normalization (unit_organisasi casing, dates, null values)
- [ ] Import: execute (insert/update employees)
- [ ] Import: auto-create user accounts (NIP = password)
- [ ] Import: error report (per-row detail)
- [ ] Import: progress indicator
- [ ] Import: log history page
- [ ] Export: Excel with current filters
- [ ] Export: styled header (green #439454, white text)

### Phase 4: Dashboard & Supporting
- [ ] Dashboard: statistics cards (total, breakdown by status_kontrak)
- [ ] Dashboard: donut chart (status kontrak)
- [ ] Dashboard: bar chart (unit organisasi)
- [ ] Dashboard: bar chart (provider)
- [ ] Dashboard: recent activities
- [ ] Activity log page (list + filter + pagination)
- [ ] User management: list users
- [ ] User management: create user
- [ ] User management: edit role/status
- [ ] User management: reset password to NIP

### Phase 5: Polish
- [ ] Responsive: tablet layout
- [ ] Responsive: mobile layout
- [ ] Loading states (skeleton/spinner)
- [ ] Empty states with illustration
- [ ] Toast notifications
- [ ] Error boundaries
- [ ] Change password page
- [ ] RLS policies verified
- [ ] GitHub Actions: Supabase keep-alive cron

---

## Catatan Teknis

> Bagian ini diisi selama development. Catat keputusan, workaround, bug fix, atau hal penting lainnya.

- Data CSV memiliki inkonsistensi yang HARUS di-handle saat import: format tanggal campuran (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY), status_pegawai 2 nilai vs status_kontrak 4 nilai, field kosong untuk pegawai non-tetap, casing tidak konsisten pada unit_organisasi

<!-- Contoh format:
### 2026-04-08: Setup Supabase
- Supabase project ID: xxx
- Region: Southeast Asia (Singapore)
- Catatan: ...
-->
