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
4. **Flat employee table** — semua field di 1 tabel, tidak ada child table
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
provider VARCHAR(100)  -- NULL/Gapura = akses semua, lainnya = scoped
```

### `employee` (flat, 45+ fields, TABEL UTAMA)
```
id BIGSERIAL PK, no INT, nip VARCHAR(30) UNIQUE NOT NULL, nik VARCHAR(20) UNIQUE,
nama_lengkap VARCHAR(200) NOT NULL, jenis_kelamin VARCHAR(10), tempat_lahir, tanggal_lahir DATE,
usia INT, alamat TEXT, kota_domisili, handphone, email VARCHAR(255) UNIQUE,
status_pegawai VARCHAR(50),       -- 'PEGAWAI TETAP' | 'PKWT' | 'TAD'
status_kontrak VARCHAR(50),       -- 'PEGAWAI TETAP' | 'PKWT' | 'PAKET SDM' | 'PAKET PEKERJAAN'
status_kerja VARCHAR(20),         -- 'Aktif' | 'Non Aktif' | 'Pensiun' | 'Mutasi'
provider VARCHAR(100), lokasi_kerja DEFAULT 'Bandar Udara Ngurah Rai', cabang DEFAULT 'DPS',
kode_organisasi VARCHAR(10), unit_organisasi VARCHAR(50),
nama_organisasi VARCHAR(200), sub_unit_organisasi VARCHAR(200),
unit_id BIGINT FK, sub_unit_id BIGINT FK,
nama_jabatan VARCHAR(200), jabatan VARCHAR(200),
kelompok_jabatan VARCHAR(100), kelas_jabatan, unit_kerja_kontrak, grade, kategori_karyawan,
tmt_mulai_kerja DATE, tmt_berakhir_kerja DATE, tmt_mulai_jabatan DATE,
tmt_akhir_jabatan DATE, tmt_berakhir_jabatan DATE, tmt_pensiun DATE,
masa_kerja VARCHAR, masa_kerja_bulan VARCHAR, masa_kerja_tahun VARCHAR,
pendidikan, pendidikan_terakhir, instansi_pendidikan, jurusan,
remarks_pendidikan, tahun_lulus INT,
no_bpjs_kesehatan, no_bpjs_ketenagakerjaan,
height INT, weight INT, jenis_sepatu, ukuran_sepatu, seragam,
organization_id INT FK, status DEFAULT 'active'
```

### Other tables
- `organization`: id, kode_organisasi UNIQUE, nama_organisasi, unit_organisasi, parent_id FK->self, is_active
- `unit` + `sub_unit`: cascading dropdown (unit_organisasi -> unit -> sub_unit)
- `activity_log`: user_id, activity, description, target_type/id/label, metadata JSONB, ip_address, created_at
- `import_log`: user_id, file_name, total_rows, success/error/skipped_count, error_details JSONB, status, started_at, completed_at

---

## Data Normalization (Saat Import)

| Field | Masalah | Solusi |
|-------|---------|--------|
| `unit_organisasi` | Casing campur | Normalisasi ke Title Case via lookup map |
| `status_kerja` | `Non Aktif` (spasi) | Simpan as-is |
| `kelompok_jabatan` | `ACCOUNT EXECUTIVE / AE` (spasi di slash) | Simpan as-is |
| Tanggal | Format campur: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY | Parse semua format, simpan ISO |
| Nilai `-` atau `?` | Bukan data valid | Convert ke NULL |
| Provider | `PT Graha Humanindo Manajemen` (ejaan baru) | Gunakan ejaan dari CSV |
| `kode_organisasi` | Hanya terisi 62% | Nullable, jangan gagalkan import |

**Mapping status_kontrak -> status_pegawai:** PEGAWAI TETAP->PEGAWAI TETAP, PKWT->PKWT, PAKET SDM->TAD, PAKET PEKERJAAN->TAD

---

## API Endpoints

**Auth**: POST login, POST logout, GET session, POST change-password
**Users** (super_admin): GET list, POST create, GET/PUT/DELETE [id], POST [id]/reset-password
**Employees**: GET list (?page&limit&search&status_pegawai&status_kontrak&unit_organisasi&provider&status_kerja&sort&order), POST create, GET/PUT/DELETE [id], GET validate/nip/[nip], GET validate/nik/[nik]
**Import/Export**: GET template, POST preview, POST execute, GET logs, POST export
**Dashboard**: GET statistics, GET charts, GET activities
**Rekap SDM**: GET /api/rekap-sdm, POST /api/rekap-sdm/export
**Cron**: POST /api/cron/update-contract-status
**Organization & Units**: GET organizations, GET units, GET units/[id]/sub-units

---

## Design System

**Colors**: Primary `#439454`, Hover `#3a8249`, Light `#e8f5e9`, Dark `#2d5a37`, Foreground `#FFFFFF`. Background `#F9FAFB`, Surface `#FFFFFF`, Text `#111827`, Muted `#6B7280`, Border `#E5E7EB`. Success `#22C55E`, Error `#EF4444`, Warning `#F59E0B`, Info `#3B82F6`.

**Font**: Figtree. **Radius**: `0.75rem` default, Cards/Buttons `rounded-xl`, Inputs `rounded-lg`.

**Status Badges**: Aktif `green-500`, Non Aktif `red-500`, Pensiun `gray-500`, Mutasi `amber-500`. Pegawai Tetap `blue-500`, TAD `violet-500`.

---

## Coding Rules

**Naming**: Files kebab-case, Components PascalCase, Functions camelCase, Constants UPPER_SNAKE, DB columns snake_case, API routes kebab-case.

**Import Order**: React/Next -> External libs -> Internal libs -> Components -> Hooks/Stores -> Types -> Constants.

**Component Pattern**: Function declarations (not arrow) for exports. Hooks at top, logic in middle, JSX at bottom.

**Commit Format**: `<type>(<scope>): <description>` (feat/fix/refactor/style/docs)

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
      rekap-sdm/page.tsx
      import/page.tsx
      export/page.tsx
      users/page.tsx                # super_admin only
      activity-logs/page.tsx
    api/
      auth/{login,logout,session}/route.ts
      employees/route.ts            # GET (list), POST (create)
      employees/[id]/route.ts       # GET, PUT, DELETE
      users/route.ts, users/[id]/route.ts
      dashboard/{statistics,charts}/route.ts
      import/{template,preview,execute}/route.ts
      export/route.ts
      rekap-sdm/route.ts, rekap-sdm/export/route.ts
      cron/update-contract-status/route.ts
      organizations/route.ts
      units/route.ts, units/[id]/sub-units/route.ts
    layout.tsx, globals.css
  components/
    layout/          # AppShell, Sidebar, TopBar
    employees/       # EmployeeTable, EmployeeForm, EmployeeDetail, ContractBadge
    dashboard/       # StatCard, Charts, RekapSummary
    import-export/   # ImportWizard, ExportDialog
    rekap-sdm/       # RekapTable
    users/           # UserTable, UserForm
    ui/              # shadcn/ui
    shared/          # LoadingSpinner, EmptyState, StatusBadge, SearchInput
  lib/
    supabase/client.ts, server.ts, middleware.ts
    db/schema.ts, migrations/
    validations/employee.ts, user.ts, import.ts
    utils/date.ts, excel.ts, format.ts, logger.ts, auth.ts
    constants/enums.ts, routes.ts
  hooks/use-employees.ts, use-dashboard.ts, use-auth.ts, use-debounce.ts
  stores/sidebar-store.ts, filter-store.ts
  types/employee.ts, user.ts, api.ts, database.ts
```

---

## Deployment

| Item | Detail |
|------|--------|
| Hosting | Vercel (Hobby/Free, 60s API timeout) |
| URL Production | https://kelola-sdm-gapura-angkasa.vercel.app |
| Auto-deploy | Ya, setiap push ke branch main |
| Database | Supabase (Singapore region, project: ccmzrkelesbxdltgcnqf) |
| Login Super Admin | NIP: SUPERADMIN, Password: SUPERADMIN |
| Import bulk | Harus via localhost (Vercel timeout 60s). DB Supabase sama. |

---

## Status Progress

### Phase 1-4: SELESAI
- [x] Phase 1: Foundation — Supabase, Drizzle schema/migrations, Auth (NIP login), AppShell layout, Seed data
- [x] Phase 2: Core CRUD — Employee list/create/detail/edit/delete, search, multi-filter, cascading dropdown
- [x] Phase 3: Import/Export — Template, upload, parse, preview, normalization, execute, auto-create accounts, export styled
- [x] Phase 4: Dashboard & Supporting — Stat cards, 7 charts, activity log, user management

### Phase 5: Polish & Revisions — SELESAI
- [x] Semua revisi: label tab, PKWT bukan TAD, dashboard charts tambahan, rekap SDM, monitoring kontrak, multi super admin per provider, GitHub Actions cron, chart bar

### Phase 6: UI/UX Enhancement & Revisi
- [x] Stat card kontrak reword + ukuran konsisten
- [x] Chart warna-warni (unit organisasi, provider, kelompok jabatan)
- [x] Dashboard aktivitas: hide login/logout
- [x] Tab "Sudah Berakhir" info breakdown
- [x] Template Import/Export Excel redesign (header hijau, sub-header, urutan kolom)
- [x] Export pilih SDM (checkbox di tabel)
- [ ] Polish: Responsive tablet layout
- [ ] Polish: Responsive mobile layout
- [ ] Polish: Loading states (skeleton/spinner)
- [ ] Polish: Empty states with illustration
- [ ] Polish: Toast notifications improvement
- [ ] Polish: Error boundaries
- [ ] Polish: Change password page

### Phase 7: UI/UX Improvement & Landing Page

#### Selesai
- [x] Landing page (hero, fitur, info perusahaan, footer, tombol Masuk)
- [x] Subtle glass UI (dashboard stat cards, chart cards, sidebar)
- [x] Dashboard: TAD tooltips, Non Aktif percentage, Rekap SDM subtitle
- [x] Daftar Karyawan: tab "Semua (termasuk non-aktif)", row click navigation
- [x] Detail Karyawan: breadcrumb nama, hapus duplicate, empty Data Seragam message
- [x] Form: tab indicators, readonly Lokasi Kerja/Cabang, redirect ke detail setelah save
- [x] Rekap SDM: subtitle konteks, sticky Grand Total, export label

#### Belum Dikerjakan

**Import Improvements**
- [x] Visual step indicator — progress bar/step (Step 1: Upload, Step 2: Preview, Step 3: Import)
- [x] Summary lebih actionable — tombol "Lihat Detail Error", "Import Ulang", "Lihat Data Karyawan"
- [x] Info auto-create akun — highlight/card: "Setiap karyawan yang di-import otomatis mendapat akun login (NIP = password)"

**Riwayat Import Improvements**
- [x] Auto-refresh atau button refresh — untuk status "Berjalan" yang stuck
- [x] Kolom "Diimport Oleh" — nama user yang melakukan import

**User Management Improvements**
- [x] Info header — teks: "Akun dibuat otomatis saat import data karyawan. Password default = NIP."
- [x] Last Login — jika NULL, tampilkan "Belum pernah login"

**Activity Log Improvements**
- [x] Filter by tipe aktivitas — dropdown: Semua, Create, Update, Delete, Import, Export, Login, Auto Update
- [x] Filter by tanggal — date range picker

**Sidebar Improvements**
- [x] Riwayat Import — pindahkan dari sidebar ke dalam halaman Import (tab/link)
- [x] Hide menu berdasarkan role — staff: sembunyikan "Tambah Karyawan" dan "Import Excel"

---

## Catatan Teknis

### Deployment & Infra
- Vercel Hobby (free tier, 60s timeout). Import bulk harus via localhost.
- Supabase: Singapore region, project ccmzrkelesbxdltgcnqf. Direct DB (port 5432) tidak bisa tanpa IPv4 add-on — semua pakai pooler (port 6543).
- Login format email proxy: `{nip}@gapura.internal`
- Auth: Email provider enabled, Confirm email disabled, semua OAuth disabled
- Logo: `public/images/gapuraangkasa.jpg`. PWA manifest: `public/manifest.json`.

### Data & Import
- Import 1.414 row: 1.273 berhasil, 135 gagal (duplicate email/NIK). 1.132 akun dibuat.
- Reset data SQL: `DELETE FROM activity_log; DELETE FROM import_log; DELETE FROM "user" WHERE nip != 'SUPERADMIN'; DELETE FROM employee;`
- 135 row gagal: kemungkinan duplicate email/NIK di CSV, perlu investigasi.

### PKWT & Status Pegawai
- `status_pegawai` 3 nilai: PEGAWAI TETAP, PKWT, TAD. PKWT bukan bagian TAD.
- TAD hanya: PAKET SDM + PAKET PEKERJAAN.
- Migration fix-pkwt sudah dijalankan. Charts API return statusPegawai (3) dan statusKontrak (4).

### Multi Super Admin per Provider
- 10 akun super_admin per provider + 1 master SUPERADMIN (PT Gapura Angkasa).
- Login: NIP = password (contoh: SUPERADMIN_GAPURA / SUPERADMIN_GAPURA).
- Gapura admin (provider = 'PT Gapura Angkasa' atau NULL) = akses semua data.
- Provider lain = scoped ke data provider mereka (employees, dashboard, export, user mgmt).
- Helper: `isGapuraAdmin()` dan `getProviderFilter()` di `src/lib/utils/auth.ts`.
- NIP/NIK validation tetap global. Activity logs tidak di-filter per provider.

### Cron Job
- Contract status update: setiap hari 00:00 WITA (16:00 UTC) via GitHub Actions.
- Workflows: `.github/workflows/cron-contract-status.yml`, `.github/workflows/supabase-keepalive.yml`
- GitHub Secrets needed: `APP_URL`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Vercel env needed: `CRON_SECRET`

### Known Issues
- Vercel Hobby timeout 60s: import bulk harus via localhost
- Button warning di console (nativeButton prop): non-blocking, shadcn/ui Base UI migration
