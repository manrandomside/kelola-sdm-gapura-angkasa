import { z } from "zod";

import {
  JENIS_SEPATU_OPTIONS,
  KELOMPOK_JABATAN_OPTIONS,
  PROVIDER_OPTIONS,
  STATUS_KERJA_OPTIONS,
  STATUS_KONTRAK_OPTIONS,
  STATUS_PEGAWAI_OPTIONS,
  UKURAN_SEPATU_OPTIONS,
  UNIT_ORGANISASI_OPTIONS,
} from "@/lib/constants/enums";

// Helper: turn empty string / "-" / "?" into null, otherwise trim.
const optionalString = (max?: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      if (trimmed === "" || trimmed === "-" || trimmed === "?") return null;
      return trimmed;
    })
    .pipe(
      max
        ? z
            .string()
            .max(max, `Maksimal ${max} karakter`)
            .nullable()
        : z.string().nullable(),
    );

// Helper: optional date — accepts ISO date string (YYYY-MM-DD) or empty.
const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    if (trimmed === "") return null;
    return trimmed;
  })
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid")
      .nullable(),
  );

// Helper: optional integer accepting numbers or numeric strings.
const optionalInt = (min?: number, max?: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null) return null;
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
      }
      const trimmed = value.trim();
      if (trimmed === "") return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : null;
    })
    .pipe(
      z
        .number()
        .int("Harus berupa bilangan bulat")
        .refine((n) => (min === undefined ? true : n >= min), {
          message: `Minimal ${min}`,
        })
        .refine((n) => (max === undefined ? true : n <= max), {
          message: `Maksimal ${max}`,
        })
        .nullable(),
    );

// Helper: optional email — empty string becomes null.
const optionalEmail = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    if (trimmed === "") return null;
    return trimmed;
  })
  .pipe(
    z
      .string()
      .email("Format email tidak valid")
      .max(255, "Maksimal 255 karakter")
      .nullable(),
  );

export const createEmployeeSchema = z.object({
  // Identitas
  nip: z
    .string()
    .trim()
    .min(1, "NIP wajib diisi")
    .max(30, "Maksimal 30 karakter"),
  nik: optionalString(20),

  // Data pribadi
  nama_lengkap: z
    .string()
    .trim()
    .min(1, "Nama lengkap wajib diisi")
    .max(200, "Maksimal 200 karakter"),
  jenis_kelamin: z.enum(["L", "P"], {
    message: "Jenis kelamin wajib dipilih",
  }),
  tempat_lahir: optionalString(100),
  tanggal_lahir: optionalDate,
  alamat: optionalString(),
  kota_domisili: optionalString(100),
  handphone: optionalString(30),
  email: optionalEmail,

  // Kepegawaian
  status_pegawai: z.enum(STATUS_PEGAWAI_OPTIONS, {
    message: "Status pegawai wajib dipilih",
  }),
  status_kontrak: z
    .union([z.enum(STATUS_KONTRAK_OPTIONS), z.literal(""), z.null()])
    .transform((v) => (v === "" || v == null ? null : v)),
  status_kerja: z
    .union([z.enum(STATUS_KERJA_OPTIONS), z.literal(""), z.null()])
    .transform((v) => (v === "" || v == null ? "Aktif" : v)),
  provider: z
    .union([z.enum(PROVIDER_OPTIONS), z.literal(""), z.null()])
    .transform((v) => (v === "" || v == null ? null : v)),

  // Organisasi & jabatan
  kode_organisasi: optionalString(10),
  unit_organisasi: z.enum(UNIT_ORGANISASI_OPTIONS, {
    message: "Unit organisasi wajib dipilih",
  }),
  nama_organisasi: optionalString(200),
  sub_unit_organisasi: optionalString(200),
  unit_id: optionalInt(1),
  sub_unit_id: optionalInt(1),
  nama_jabatan: z
    .string()
    .trim()
    .min(1, "Nama jabatan wajib diisi")
    .max(200, "Maksimal 200 karakter"),
  jabatan: optionalString(200),
  kelompok_jabatan: z.enum(KELOMPOK_JABATAN_OPTIONS, {
    message: "Kelompok jabatan wajib dipilih",
  }),
  kelas_jabatan: optionalString(100),
  unit_kerja_kontrak: optionalString(255),
  grade: optionalString(50),
  kategori_karyawan: optionalString(100),

  // Tanggal kepegawaian
  tmt_mulai_kerja: optionalDate,
  tmt_berakhir_kerja: optionalDate,
  tmt_mulai_jabatan: optionalDate,
  tmt_akhir_jabatan: optionalDate,
  tmt_berakhir_jabatan: optionalDate,
  tmt_pensiun: optionalDate,

  // Pendidikan
  pendidikan: optionalString(100),
  pendidikan_terakhir: optionalString(100),
  instansi_pendidikan: optionalString(200),
  jurusan: optionalString(200),
  remarks_pendidikan: optionalString(100),
  tahun_lulus: optionalInt(1900, 2100),

  // Administrasi
  no_bpjs_kesehatan: optionalString(50),
  no_bpjs_ketenagakerjaan: optionalString(50),

  // Fisik & seragam
  height: optionalInt(50, 250),
  weight: optionalInt(20, 250),
  jenis_sepatu: z
    .union([z.enum(JENIS_SEPATU_OPTIONS), z.literal(""), z.null()])
    .transform((v) => (v === "" || v == null ? null : v)),
  ukuran_sepatu: z
    .union([z.enum(UKURAN_SEPATU_OPTIONS), z.literal(""), z.null()])
    .transform((v) => (v === "" || v == null ? null : v)),
  seragam: optionalString(100),
});

export type CreateEmployeeInput = z.input<typeof createEmployeeSchema>;
export type CreateEmployeeOutput = z.output<typeof createEmployeeSchema>;
