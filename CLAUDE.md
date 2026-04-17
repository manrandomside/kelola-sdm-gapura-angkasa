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
      settings/password/page.tsx  # ubah password
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
    assistant/       # ChatSidebar, ChatArea
    layout/          # AppShell, Sidebar, TopBar
    employees/       # EmployeeTable, EmployeeForm, EmployeeDetail, ContractBadge
    dashboard/       # StatCard, Charts, RekapSummary
    pwa/             # ServiceWorkerRegister, InstallButton
    import-export/   # ImportWizard, ExportDialog
    rekap-sdm/       # RekapTable
    users/           # UserTable, UserForm
    ui/              # shadcn/ui
    shared/          # LoadingSpinner, EmptyState, StatusBadge, SearchInput
  lib/
    supabase/client.ts, server.ts, middleware.ts
    db/schema.ts, migrations/
    validations/employee.ts, user.ts, import.ts
    utils/date.ts, excel.ts, format.ts, logger.ts, auth.ts, ai-provider.ts
    constants/enums.ts, routes.ts
  hooks/use-employees.ts, use-dashboard.ts, use-auth.ts, use-debounce.ts, use-assistant.ts, use-conversations.ts
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
- [x] Polish: Responsive tablet layout
- [x] Polish: Responsive mobile layout
- [x] Polish: Loading states (skeleton/spinner)
- [x] Polish: Empty states with illustration
- [x] Polish: Toast notifications improvement
- [x] Polish: Error boundaries
- [x] Polish: Change password page

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

### Phase 8: Advanced Features & Revisi Tambahan

#### Revisi Tambahan
- [x] Non Aktif detail: klik angka Non Aktif (dashboard/management karyawan) memuat breakdown alasan non-aktif (TMT berakhir kerja lewat, Pensiun, Manual) dengan daftar karyawan per grup
- [x] Export enhancement: dialog export custom dengan filter (status kerja, status pegawai, provider, unit organisasi, rentang TMT berakhir kerja) + preview jumlah sebelum export — tidak terbatas pagination
- [x] Rekap SDM: hapus tombol panah sort (atas/bawah) di header tabel, biarkan default sort A-Z saja

#### Dashboard Perbandingan Periode (Halaman Terpisah)
- [x] Halaman baru: /analytics (atau /perbandingan)
- [x] Tren karyawan masuk vs keluar per bulan (line chart, 12 bulan terakhir) — masuk = tmt_mulai_kerja, keluar = tmt_berakhir_kerja
- [x] Perbandingan bulan ini vs bulan lalu: Total SDM, Aktif, Non Aktif, Kontrak Berakhir — dengan indikator naik/turun dan selisih angka
- [x] Turn-over rate per provider: tabel Provider | Total | Masuk | Keluar | Turn-over %
- [x] Menu sidebar: tambah menu "Analitik" atau "Perbandingan" dengan ikon TrendingUp atau BarChart2

#### Report Generator PDF (Halaman Terpisah)
- [x] Halaman baru: /reports
- [x] Laporan Bulanan SDM: ringkasan total, masuk/keluar bulan ini, breakdown per unit dan provider, chart — styling formal dengan logo Gapura Angkasa
- [x] Laporan Per Provider: data spesifik provider, total karyawan, kontrak aktif/berakhir, daftar karyawan — untuk dikirim ke provider
- [x] Laporan Kontrak: daftar kontrak akan berakhir 30/60/90 hari, grouped per provider dan unit
- [x] Format output: PDF profesional dengan logo, header, tabel rapi
- [x] Menu sidebar: tambah menu "Laporan" dengan ikon FileText

#### AI Chat Assistant (Halaman Terpisah)
- [x] Halaman baru: /assistant
- [x] Chat interface: user ketik pertanyaan tentang data SDM, AI jawab berdasarkan data real dari database
- [x] Multi-provider AI dengan waterfall: Primary = Google Gemini (free), Fallback = Groq (free). Timeout 10 detik per provider
- [x] Pertanyaan dijawab dalam bahasa Indonesia
- [x] Data context: kirim statistik/aggregat ke AI (bukan seluruh row), query database sesuai konteks pertanyaan
- [x] Provider scope: AI hanya bisa jawab berdasarkan data yang bisa diakses user (sesuai provider)
- [x] Role scope: semua role bisa akses (super_admin, admin, staff) tapi data yang dikirim ke AI sesuai hak akses
- [x] Riwayat chat persistent ke database (tabel conversation + chat_message)
- [x] Environment variables baru: GEMINI_API_KEY, GROQ_API_KEY
- [x] Menu sidebar: tambah menu "Asisten SDM" dengan ikon Bot

#### Persistent Chat
- [x] Chat persistent: tabel conversation + chat_message
- [x] API CRUD conversations (list, create, get, rename, delete)
- [x] Chat API update — simpan pesan ke database, support conversationId
- [x] Hook useConversations (list, create, rename, delete)
- [x] Hook useAssistant updated — track conversationId, loadConversation
- [x] UI Chat sidebar riwayat percakapan (desktop + mobile responsive)
- [x] Rename dan delete percakapan
- [x] Group percakapan by waktu (Hari Ini, Kemarin, dll)
- [x] Mobile drawer untuk sidebar
- [x] Fix export dialog scroll (max-h-[85vh] overflow-y-auto)
- [x] Hapus halaman /export lama — export hanya via dialog di /employees
- [x] Sidebar: hapus menu Export Excel & Laporan terpisah, tambah Laporan PDF di submenu Import & Export
- [x] Dashboard: jam real-time (detik) + rename stat card "Total Karyawan" ke "Total"
- [x] Login page: split layout desktop (50/50) + tablet (35/65) + mobile (form only), panel kiri branding hijau, panel kanan form, link kembali ke beranda
- [x] Landing page: update 6 fitur (termasuk AI Assistant dan Laporan PDF), 5 stats bar
- [x] Sidebar: rename "Import & Export" menjadi "Import & Laporan"
- [x] Fix chart kedip-kedip: isAnimationActive=false, useMemo data, clock terpisah, React.memo chart components
- [x] PWA support: manifest.json, service worker, install button di landing page

---

## Phase 8 Detail

### Non Aktif Detail Breakdown
- Saat klik angka Non Aktif di dashboard stat card atau di management karyawan:
  - Bisa navigasi ke halaman/modal yang menampilkan breakdown
  - Grup 1: TMT Berakhir Kerja sudah lewat (kontrak habis)
  - Grup 2: Pensiun (status_kerja = 'Pensiun')
  - Grup 3: Non Aktif manual (status_kerja = 'Non Aktif' tapi bukan karena TMT)
  - Setiap grup expandable untuk lihat daftar karyawan
  - Total harus cocok dengan angka Non Aktif di stat card

### Export Custom Dialog
- Dialog muncul saat klik Export di /employees
- Opsi: Export Semua | Export Terpilih | Export Custom
- Export Custom filters: Status Kerja, Status Pegawai, Provider, Unit Organisasi, Rentang TMT Berakhir Kerja
- Preview: "Akan mengexport X karyawan" (hitung dari API sebelum actual export)
- Tidak terbatas pagination — query langsung ke database dengan filter
- Format output tetap sama (header hijau, 45 kolom)

### Dashboard Perbandingan Periode
- Route: /analytics
- Data dihitung dari field tmt_mulai_kerja dan tmt_berakhir_kerja di tabel employee
- Masuk = COUNT karyawan yang tmt_mulai_kerja jatuh di bulan tersebut
- Keluar = COUNT karyawan yang tmt_berakhir_kerja jatuh di bulan tersebut
- 12 bulan terakhir dari bulan saat ini
- Perbandingan bulan ini vs bulan lalu: hitung selisih dan tampilkan arrow up/down
- Turn-over rate = (Keluar / Total) * 100% per provider per bulan
- Provider scope berlaku: Super Admin provider hanya lihat data mereka
- API endpoint: GET /api/analytics

### Report Generator PDF
- Route: /reports
- Library: jsPDF atau @react-pdf/renderer (pilih yang paling cocok)
- Semua laporan generate di client-side (browser) atau server-side (API route)
- Styling: logo Gapura Angkasa di header, font profesional, tabel dengan border, warna hijau primary
- Laporan Bulanan: pilih bulan/tahun -> generate
- Laporan Provider: pilih provider -> generate
- Laporan Kontrak: pilih rentang hari (30/60/90) -> generate
- Provider scope: Super Admin provider hanya bisa generate laporan provider mereka

### AI Chat Assistant
- Route: /assistant
- UI: chat interface mirip ChatGPT/Claude — input di bawah, pesan di atas, scroll
- Waterfall AI providers:
  1. Google Gemini (gemini-2.0-flash) — endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
  2. Groq (llama-3.1-70b-versatile) — endpoint: https://api.groq.com/openai/v1/chat/completions
  3. Timeout per provider: 10 detik
  4. Jika semua gagal: "Asisten sedang tidak tersedia, coba lagi nanti"
- Context building: sebelum kirim ke AI, query database untuk mendapat statistik/data relevan berdasarkan pertanyaan user
- System prompt: "Kamu adalah asisten SDM PT Gapura Angkasa. Jawab pertanyaan berdasarkan data yang diberikan. Jawab dalam bahasa Indonesia."
- Provider scope di context: hanya kirim data yang bisa diakses user
- Env vars: GEMINI_API_KEY, GROQ_API_KEY (tambahkan di .env.local dan Vercel)

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

### AI Chat Assistant (2026-04-15)
- AI provider waterfall: Gemini (primary) -> Groq (fallback), timeout 10s per provider
- Perlu set env vars: `GEMINI_API_KEY` dan `GROQ_API_KEY` (di `.env.local` dan Vercel)
- Data context: statistik aggregat dari database, bukan raw employee data
- Provider scope berlaku: AI hanya jawab berdasarkan data yang bisa diakses user

### Persistent Chat (2026-04-15)
- Tabel `conversation` dan `chat_message` ditambahkan ke database
- Migration endpoint: `POST /api/migrations/add-chat-tables` (super_admin only)
- API CRUD conversations: list, create, get messages, rename, delete
- Chat API (`POST /api/assistant/chat`) menyimpan pesan ke database, support `conversationId`
- Percakapan disimpan per user, max 20 pesan terakhir dikirim ke AI untuk hemat token
- Ownership check: user hanya bisa akses percakapannya sendiri
- Hook `useConversations` untuk list/create/rename/delete conversations
- Hook `useAssistant` updated: track `conversationId`, expose `loadConversation`

### PWA Support (2026-04-16)
- Manifest: `public/manifest.json` — start_url="/", scope="/", purpose="any" (bukan "any maskable")
- Icons: `public/icon-192.png`, `public/icon-512.png` (root level, bukan subfolder)
- Service worker: `public/sw.js` — network-first, skipWaiting + clients.claim, skip /api/ requests
- Components: `src/components/pwa/service-worker-register.tsx`, `src/components/pwa/install-button.tsx`
- Install button: platform detection (ios/android/desktop) + manual guide fallback untuk Safari/Firefox
- Install button ditampilkan di landing page (section sebelum footer)
- ServiceWorkerRegister di-mount di root layout
- PWA hanya installable dari HTTPS (production Vercel), bukan localhost

### Chart Performance Fix (2026-04-16)
- Semua chart Recharts: `isAnimationActive={false}` pada Bar, Pie, Line, Area, Tooltip
- Dashboard clock diekstrak ke komponen `ClockDisplay` terpisah agar tidak trigger re-render chart
- Chart components di-wrap dengan `React.memo` di dashboard page
- Color arrays di-memoize dengan `useMemo`
- Analytics page charts juga di-fix

### Responsive Layout & Polish (2026-04-16)
- Mobile-first responsive: Tailwind sm:/md:/lg: prefixes, mobile breakpoint <768px
- Sidebar: desktop fixed (lg+), mobile/tablet drawer via shadcn Sheet (already existed)
- Dashboard: stat cards `grid-cols-2 md:grid-cols-3 xl:grid-cols-6`, charts `lg:grid-cols-2`
- Daftar Karyawan: stat cards grid responsive, collapsible filter on mobile (Filter button toggle), contract tabs horizontal scroll, employee table overflow-x-auto, action buttons icon-only on mobile
- Detail Karyawan: mobile sticky bottom action bar (Kembali/Edit/Hapus), desktop action buttons in header, bottom padding for mobile bar
- Activity Log: collapsible filter on mobile (Filter button toggle), table overflow-x-auto
- Filter Bar: grid layout on mobile (2 cols), flex-wrap on desktop
- Rekap SDM & Analytics: already responsive grids, tables with overflow-x-auto
- Empty States: reusable `EmptyState` component (`src/components/shared/empty-state.tsx`) used across: employees (no data + no results), activity logs, import logs, rekap SDM, analytics
- Loading Skeletons: inline skeletons per page (dashboard stat/chart, employee table, detail, edit, rekap, analytics, activity logs, import logs)
- Reusable `TableSkeleton` component at `src/components/shared/table-skeleton.tsx`

### Toast Notifications (2026-04-17)
- Toast utility wrapper: `src/lib/utils/toast.ts` — standardized success/error/warning/info/loading/promise methods with consistent durations (success 4s, error 5s, warning 4.5s)
- Toast messages constants: `src/lib/constants/toast-messages.ts` — standardized Indonesian messages
- All toast imports migrated from `sonner` to `@/lib/utils/toast` wrapper across: hooks (use-employee-detail, use-export, use-import, use-users), components (employee-form), pages (import, reports)
- Toaster configured globally: position top-right, richColors, closeButton, theme light, duration 4000ms
- Toaster mounted in both root layout and dashboard layout for coverage

### Error Boundaries (2026-04-17)
- ErrorBoundary component: `src/components/shared/error-boundary.tsx` — class component, dev error details, Muat Ulang + Ke Beranda buttons
- Global error page: `src/app/error.tsx` — Next.js error boundary for unhandled errors
- 404 page: `src/app/not-found.tsx` — friendly "Halaman Tidak Ditemukan" page
- Dashboard layout wraps children with ErrorBoundary

### Change Password (2026-04-17)
- API: `POST /api/auth/change-password` — validates current password via signInWithPassword, updates via admin.updateUserById, logs activity
- Page: `/settings/password` — react-hook-form + zod validation, show/hide toggle, min 6 chars, confirm match
- Hook: `src/hooks/use-change-password.ts` — useMutation with toast feedback
- Route: `ROUTES.CHANGE_PASSWORD = "/settings/password"`

### User Profile Dropdown (2026-04-17)
- Sidebar footer replaced: separate "Ubah Password" link + "Keluar" button → unified Popover dropdown
- Popover opens upward (side="top") from avatar area at bottom of sidebar
- Shows: full name, NIP, role, provider, "Profil Saya" (disabled, badge "Segera"), "Ubah Password", "Keluar"
- Avatar: green circle with 2-letter initials from user name
- Works in both desktop sidebar and mobile drawer

### Sidebar Collapse (2026-04-17)
- Desktop-only collapse: toggle button (PanelLeftClose/PanelLeftOpen) in sidebar header
- Collapsed width: 64px (w-16), expanded: 256px (w-64)
- Collapsed mode: icon-only menu items with Tooltip on hover (side="right")
- Collapsed groups: click icon navigates to first child page
- Collapsed logo: small 32x32 logo without text
- Collapsed profile: avatar-only, click still opens full popover
- State persisted to localStorage via Zustand persist middleware (key: "sidebar-collapsed")
- Smooth transition: `transition-all duration-300` on sidebar and main content
- Mobile/tablet drawer unaffected — always expanded, `isMobileDrawer` prop

### Global Search (2026-04-17)
- Search box in TopBar: desktop always visible (320px), mobile icon toggle
- Hook: `src/hooks/use-global-search.ts` — debounced 300ms, calls GET /api/employees?search&limit=5
- Component: `src/components/layout/global-search.tsx` — dropdown with results, keyboard navigation
- Features: arrow up/down navigation, Enter to select, Escape to close, click outside to close
- Results show: avatar initials, name, NIP, unit organisasi
- "Lihat semua X hasil" link → navigates to /employees?search=query
- Keyboard shortcut: Ctrl+K (or Cmd+K) focuses search input

### Keyboard Shortcuts (2026-04-17)
- Hook: `src/hooks/use-keyboard-shortcuts.ts` — generic keyboard shortcut handler
- Ctrl+K / Cmd+K: focus global search
- Escape: close search dropdown

### Comprehensive Responsive Fix (2026-04-17)
- `useIsMobile` hook: `src/hooks/use-mobile.ts` — window.innerWidth < 768px with resize listener
- All 6 dashboard chart components updated with `useIsMobile`:
  - `status-kontrak-chart.tsx`: SHORT_LABELS mapping, responsive font sizes (9px mobile, 11px desktop), responsive height/margins/bar sizes
  - `age-chart.tsx`: responsive font sizes, height (240px vs 288px)
  - `bar-chart-card.tsx`: `truncateLabel` helper, responsive YAxis width (70px mobile vs 140px vertical), effectiveHeight capped at 260 mobile
  - `gender-chart.tsx`: responsive innerRadius (40/60), outerRadius (70/95), chart height (200/256)
  - `position-group-chart.tsx`: SHORT_LABELS for long names (AE, GM, EGM), YAxis width (80/170), font sizes
  - `status-org-chart.tsx`: rotated XAxis labels on mobile (-45deg), responsive height (260/320), YAxis width, legend sizing
- Stat cards: responsive text sizes — title `text-[11px] sm:text-xs`, value `text-xl sm:text-2xl`, description `text-[10px] sm:text-xs`
- Employee page MiniStatCard: responsive text sizes matching stat cards
- Analytics page: responsive chart height (260/350), comparison card text sizes, legend/axis font sizes
- Reports page: responsive form layout (flex-col on mobile, flex-row on desktop), provider select full-width on mobile
- AI Assistant: `min-w-0 overflow-hidden` on chat container, `break-words` on message bubbles, `.chat-content` CSS for pre/code/table overflow
- Global CSS: `overflow-x: hidden` on html/body, `.chat-content` styles for code blocks and tables

### Known Issues
- Vercel Hobby timeout 60s: import bulk harus via localhost
- Button warning di console (nativeButton prop): non-blocking, shadcn/ui Base UI migration
