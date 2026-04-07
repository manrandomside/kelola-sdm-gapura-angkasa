import {
  bigint,
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// Reusable timestamp helpers.
const createdAt = timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull();

const updatedAt = timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull();

// ============================================================================
// organization — Unit kerja organisasi (reference table)
// ============================================================================
export const organization = pgTable("organization", {
  id: serial("id").primaryKey(),
  kode_organisasi: varchar("kode_organisasi", { length: 10 }).unique().notNull(),
  nama_organisasi: varchar("nama_organisasi", { length: 200 }).notNull(),
  unit_organisasi: varchar("unit_organisasi", { length: 50 }).notNull(),
  parent_id: integer("parent_id").references((): AnyPgColumn => organization.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  is_active: boolean("is_active").default(true).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  created_at: createdAt,
  updated_at: updatedAt,
});

// ============================================================================
// unit — Cascading dropdown level 1
// ============================================================================
export const unit = pgTable("unit", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  unit_organisasi: varchar("unit_organisasi", { length: 50 }).notNull(),
  kode: varchar("kode", { length: 10 }).notNull(),
  nama: varchar("nama", { length: 200 }).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  created_at: createdAt,
  updated_at: updatedAt,
});

// ============================================================================
// sub_unit — Cascading dropdown level 2 (child of unit)
// ============================================================================
export const subUnit = pgTable("sub_unit", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  unit_id: bigint("unit_id", { mode: "number" })
    .notNull()
    .references(() => unit.id, { onDelete: "cascade" }),
  nama: varchar("nama", { length: 200 }).notNull(),
  kode: varchar("kode", { length: 20 }),
  is_active: boolean("is_active").default(true).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  created_at: createdAt,
  updated_at: updatedAt,
});

// ============================================================================
// employee — Main table (flat, 45+ fields)
// ============================================================================
export const employee = pgTable("employee", {
  id: bigserial("id", { mode: "number" }).primaryKey(),

  // Nomor urut & identitas
  no: integer("no"),
  nip: varchar("nip", { length: 30 }).unique().notNull(),
  nik: varchar("nik", { length: 20 }).unique(),

  // Data pribadi
  nama_lengkap: varchar("nama_lengkap", { length: 200 }).notNull(),
  jenis_kelamin: varchar("jenis_kelamin", { length: 10 }),
  tempat_lahir: varchar("tempat_lahir", { length: 100 }),
  tanggal_lahir: date("tanggal_lahir"),
  usia: integer("usia"),
  alamat: text("alamat"),
  kota_domisili: varchar("kota_domisili", { length: 100 }),
  handphone: varchar("handphone", { length: 30 }),
  email: varchar("email", { length: 255 }).unique(),

  // Data kepegawaian
  status_pegawai: varchar("status_pegawai", { length: 50 }),
  status_kontrak: varchar("status_kontrak", { length: 50 }),
  status_kerja: varchar("status_kerja", { length: 20 }).default("Non Aktif"),
  provider: varchar("provider", { length: 100 }),
  lokasi_kerja: varchar("lokasi_kerja", { length: 200 }).default(
    "Bandar Udara Ngurah Rai",
  ),
  cabang: varchar("cabang", { length: 10 }).default("DPS"),

  // Organisasi & jabatan
  kode_organisasi: varchar("kode_organisasi", { length: 10 }),
  unit_organisasi: varchar("unit_organisasi", { length: 50 }),
  nama_organisasi: varchar("nama_organisasi", { length: 200 }),
  sub_unit_organisasi: varchar("sub_unit_organisasi", { length: 200 }),
  unit_id: bigint("unit_id", { mode: "number" }).references(() => unit.id, {
    onDelete: "set null",
  }),
  sub_unit_id: bigint("sub_unit_id", { mode: "number" }).references(
    () => subUnit.id,
    { onDelete: "set null" },
  ),
  nama_jabatan: varchar("nama_jabatan", { length: 200 }),
  jabatan: varchar("jabatan", { length: 200 }),
  kelompok_jabatan: varchar("kelompok_jabatan", { length: 100 }),
  kelas_jabatan: varchar("kelas_jabatan", { length: 100 }),
  unit_kerja_kontrak: varchar("unit_kerja_kontrak", { length: 255 }),
  grade: varchar("grade", { length: 50 }),
  kategori_karyawan: varchar("kategori_karyawan", { length: 100 }),

  // Tanggal kepegawaian (TMT = Terhitung Mulai Tanggal)
  tmt_mulai_kerja: date("tmt_mulai_kerja"),
  tmt_berakhir_kerja: date("tmt_berakhir_kerja"),
  tmt_mulai_jabatan: date("tmt_mulai_jabatan"),
  tmt_akhir_jabatan: date("tmt_akhir_jabatan"),
  tmt_berakhir_jabatan: date("tmt_berakhir_jabatan"),
  tmt_pensiun: date("tmt_pensiun"),
  masa_kerja: varchar("masa_kerja", { length: 50 }),
  masa_kerja_bulan: varchar("masa_kerja_bulan", { length: 20 }),
  masa_kerja_tahun: varchar("masa_kerja_tahun", { length: 20 }),

  // Pendidikan
  pendidikan: varchar("pendidikan", { length: 100 }),
  pendidikan_terakhir: varchar("pendidikan_terakhir", { length: 100 }),
  instansi_pendidikan: varchar("instansi_pendidikan", { length: 200 }),
  jurusan: varchar("jurusan", { length: 200 }),
  remarks_pendidikan: varchar("remarks_pendidikan", { length: 100 }),
  tahun_lulus: integer("tahun_lulus"),

  // Administrasi
  no_bpjs_kesehatan: varchar("no_bpjs_kesehatan", { length: 50 }),
  no_bpjs_ketenagakerjaan: varchar("no_bpjs_ketenagakerjaan", { length: 50 }),

  // Fisik & seragam
  height: integer("height"),
  weight: integer("weight"),
  jenis_sepatu: varchar("jenis_sepatu", { length: 50 }),
  ukuran_sepatu: varchar("ukuran_sepatu", { length: 10 }),
  seragam: varchar("seragam", { length: 100 }),

  // Relasi & status record
  organization_id: integer("organization_id").references(() => organization.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 20 }).default("active").notNull(),

  created_at: createdAt,
  updated_at: updatedAt,
});

// ============================================================================
// user — Sistem login (NIP sebagai username)
// Nama tabel di-quote sebagai "user" (reserved word di Postgres).
// ============================================================================
export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  supabase_auth_id: uuid("supabase_auth_id").unique().notNull(),
  nip: varchar("nip", { length: 30 }).unique().notNull(),
  email: varchar("email", { length: 255 }),
  full_name: varchar("full_name", { length: 200 }).notNull(),
  role: varchar("role", { length: 20 }).default("staff").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  employee_id: bigint("employee_id", { mode: "number" }).references(
    () => employee.id,
    { onDelete: "set null" },
  ),
  last_login_at: timestamp("last_login_at", { withTimezone: true }),
  created_at: createdAt,
  updated_at: updatedAt,
});

// ============================================================================
// activity_log — Audit trail untuk aksi user
// ============================================================================
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
  user_email: varchar("user_email", { length: 255 }),
  user_name: varchar("user_name", { length: 150 }),
  activity: varchar("activity", { length: 50 }).notNull(),
  description: text("description").notNull(),
  target_type: varchar("target_type", { length: 50 }),
  target_id: uuid("target_id"),
  target_label: varchar("target_label", { length: 200 }),
  metadata: jsonb("metadata"),
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  created_at: createdAt,
});

// ============================================================================
// import_log — Riwayat import Excel
// ============================================================================
export const importLog = pgTable("import_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
  file_name: varchar("file_name", { length: 255 }).notNull(),
  file_url: text("file_url"),
  total_rows: integer("total_rows").default(0).notNull(),
  success_count: integer("success_count").default(0).notNull(),
  error_count: integer("error_count").default(0).notNull(),
  skipped_count: integer("skipped_count").default(0).notNull(),
  error_details: jsonb("error_details"),
  status: varchar("status", { length: 20 }).default("processing").notNull(),
  started_at: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  created_at: createdAt,
});

// ============================================================================
// app_setting — Key/value settings untuk konfigurasi aplikasi
// ============================================================================
export const appSetting = pgTable("app_setting", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updated_by: uuid("updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  updated_at: updatedAt,
});
