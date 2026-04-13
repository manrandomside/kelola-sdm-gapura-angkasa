import * as XLSX from "xlsx";
import * as XLSXStyle from "xlsx-js-style";

import { formatDateWITA, parseFlexibleDate, toISODateString } from "@/lib/utils/date";
import {
  EXCEL_COLUMNS,
  buildHeaderCellText,
  getDataCellStyle,
  getHeaderCellStyle,
  setColumnWidths,
  setRowHeights,
} from "@/lib/utils/excel-template";
import {
  JENIS_KELAMIN_OPTIONS,
  KELOMPOK_JABATAN_OPTIONS,
  PROVIDER_OPTIONS,
  STATUS_KERJA_OPTIONS,
  STATUS_KONTRAK_OPTIONS,
  STATUS_KONTRAK_TO_PEGAWAI,
  STATUS_PEGAWAI_OPTIONS,
  UNIT_ORGANISASI_NORMALIZE,
  UNIT_ORGANISASI_OPTIONS,
} from "@/lib/constants/enums";

// ============================================================================
// Types
// ============================================================================

export type RawRow = Record<string, unknown>;

export interface NormalizedRow {
  no: number | null;
  nip: string | null;
  nik: string | null;
  nama_lengkap: string | null;
  jenis_kelamin: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  usia: number | null;
  alamat: string | null;
  kota_domisili: string | null;
  handphone: string | null;
  email: string | null;
  status_pegawai: string | null;
  status_kontrak: string | null;
  status_kerja: string | null;
  provider: string | null;
  lokasi_kerja: string | null;
  cabang: string | null;
  kode_organisasi: string | null;
  unit_organisasi: string | null;
  nama_organisasi: string | null;
  sub_unit_organisasi: string | null;
  nama_jabatan: string | null;
  unit_kerja_kontrak: string | null;
  tmt_mulai_kerja: string | null;
  tmt_berakhir_kerja: string | null;
  tmt_mulai_jabatan: string | null;
  tmt_berakhir_jabatan: string | null;
  tmt_pensiun: string | null;
  masa_kerja_bulan: string | null;
  masa_kerja_tahun: string | null;
  pendidikan: string | null;
  instansi_pendidikan: string | null;
  jurusan: string | null;
  remarks_pendidikan: string | null;
  tahun_lulus: number | null;
  kategori_karyawan: string | null;
  grade: string | null;
  no_bpjs_kesehatan: string | null;
  no_bpjs_ketenagakerjaan: string | null;
  kelompok_jabatan: string | null;
  kelas_jabatan: string | null;
  jenis_sepatu: string | null;
  ukuran_sepatu: string | null;
  height: number | null;
  weight: number | null;
}

type NormalizedField = keyof NormalizedRow;

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export type ImportRowStatus = "valid" | "warning" | "error";

export interface ImportPreviewRow {
  rowNumber: number;
  data: NormalizedRow;
  validation: ValidationResult;
  status: ImportRowStatus;
  isExistingNip: boolean;
}

export interface ImportPreviewSummary {
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  newCount: number;
  updateCount: number;
  skippedCount: number;
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[];
  summary: ImportPreviewSummary;
  headers: string[];
}

// ============================================================================
// Template headers (45 kolom) — digunakan untuk generate template .xlsx
// Urutan dan nama mengikuti format CSV sumber agar kompatibel dengan data
// legacy SDM Gapura Angkasa.
// ============================================================================
export const TEMPLATE_HEADERS: readonly string[] = [
  "NO",
  "NIP",
  "KTP / NIK",
  "NAMA LENGKAP",
  "LOKASI KERJA",
  "CABANG",
  "STATUS PEGAWAI",
  "STATUS KONTRAK",
  "STATUS KERJA",
  "PROVIDER",
  "UNIT ORGANISASI",
  "KODE ORGANISASI",
  "NAMA ORGANISASI",
  "SUB UNIT ORGANISASI",
  "NAMA JABATAN",
  "UNIT KERJA SESUAI KONTRAK",
  "TMT MULAI KERJA",
  "TMT MULAI JABATAN",
  "TMT BERAKHIR JABATAN",
  "TMT BERAKHIR KERJA",
  "MASA KERJA (BULAN)",
  "MASA KERJA (TAHUN)",
  "JENIS KELAMIN",
  "JENIS SEPATU",
  "UKURAN SEPATU",
  "TEMPAT LAHIR",
  "TANGGAL LAHIR",
  "USIA",
  "KOTA DOMISILI",
  "ALAMAT",
  "PENDIDIKAN",
  "NAMA INSTANSI PENDIDIKAN",
  "JURUSAN",
  "REMARKS PENDIDIKAN",
  "TAHUN LULUS",
  "HANDPHONE",
  "KATEGORI KARYAWAN",
  "TMT PENSIUN",
  "GRADE",
  "NO BPJS KESEHATAN",
  "NO BPJS KETENAGAKERJAAN",
  "KELOMPOK JABATAN",
  "KELAS JABATAN",
  "WEIGHT",
  "HEIGHT",
];

// ============================================================================
// Header mapping: lowercase header text -> field name NormalizedRow.
// Case-insensitive dan support beberapa variasi ejaan "KTP / NIK".
// ============================================================================
const COLUMN_MAP: Record<string, NormalizedField> = {
  no: "no",
  nip: "nip",
  "ktp / nik": "nik",
  "ktp/ nik": "nik",
  "ktp /nik": "nik",
  "ktp/nik": "nik",
  nik: "nik",
  "nama lengkap": "nama_lengkap",
  "lokasi kerja": "lokasi_kerja",
  cabang: "cabang",
  "status pegawai": "status_pegawai",
  "status kontrak": "status_kontrak",
  "status kerja": "status_kerja",
  provider: "provider",
  "unit organisasi": "unit_organisasi",
  "kode organisasi": "kode_organisasi",
  "nama organisasi": "nama_organisasi",
  "sub unit organisasi": "sub_unit_organisasi",
  "nama jabatan": "nama_jabatan",
  "unit kerja sesuai kontrak": "unit_kerja_kontrak",
  "tmt mulai kerja": "tmt_mulai_kerja",
  "tmt mulai jabatan": "tmt_mulai_jabatan",
  "tmt berakhir jabatan": "tmt_berakhir_jabatan",
  "tmt berakhir kerja": "tmt_berakhir_kerja",
  "masa kerja (bulan)": "masa_kerja_bulan",
  "masa kerja (tahun)": "masa_kerja_tahun",
  "jenis kelamin": "jenis_kelamin",
  "jenis sepatu": "jenis_sepatu",
  "ukuran sepatu": "ukuran_sepatu",
  "tempat lahir": "tempat_lahir",
  "tanggal lahir": "tanggal_lahir",
  usia: "usia",
  "kota domisili": "kota_domisili",
  alamat: "alamat",
  pendidikan: "pendidikan",
  "nama instansi pendidikan": "instansi_pendidikan",
  jurusan: "jurusan",
  "remarks pendidikan": "remarks_pendidikan",
  "tahun lulus": "tahun_lulus",
  handphone: "handphone",
  "kategori karyawan": "kategori_karyawan",
  "tmt pensiun": "tmt_pensiun",
  grade: "grade",
  "no bpjs kesehatan": "no_bpjs_kesehatan",
  "no bpjs ketenagakerjaan": "no_bpjs_ketenagakerjaan",
  "kelompok jabatan": "kelompok_jabatan",
  "kelas jabatan": "kelas_jabatan",
  weight: "weight",
  height: "height",
  email: "email",
};

// Nilai yang diperlakukan sebagai null saat normalisasi.
const NULL_LITERALS = new Set(["", "-", "?", "null", "n/a", "na", "#n/a"]);

const DATE_FIELDS: ReadonlySet<NormalizedField> = new Set([
  "tanggal_lahir",
  "tmt_mulai_kerja",
  "tmt_berakhir_kerja",
  "tmt_mulai_jabatan",
  "tmt_berakhir_jabatan",
  "tmt_pensiun",
]);

const INTEGER_FIELDS: ReadonlySet<NormalizedField> = new Set([
  "no",
  "usia",
  "tahun_lulus",
  "height",
  "weight",
]);

// ============================================================================
// Helpers
// ============================================================================

// Normalisasi satu header string: ambil baris pertama (header Excel sering
// menggunakan multi-line), lowercase, trim.
function normalizeHeader(header: string): string {
  const firstLine = header.split(/\r?\n/)[0] ?? "";
  return firstLine.trim().toLowerCase().replace(/\s+/g, " ");
}

// Collapse multi-line header to single line, join with space, lowercase, trim.
// Used when first-line-only matching fails (e.g. "MASA KERJA\n(BULAN)").
function normalizeHeaderFull(header: string): string {
  return header.replace(/\r?\n/g, " ").trim().toLowerCase().replace(/\s+/g, " ");
}

// Mapping satu header ke nama field database. Multi-pass:
// 1) First-line lookup langsung.
// 2) Strip trailing parenthesized group dari first-line.
// 3) Full text (all lines joined) lookup — handles "MASA KERJA\n(BULAN)".
// 4) Strip all sub-header hints from full text.
function lookupField(header: string): NormalizedField | null {
  // Pass 1: first line only
  const normalized = normalizeHeader(header);
  if (COLUMN_MAP[normalized]) return COLUMN_MAP[normalized];

  // Pass 2: first line, strip trailing parens
  const stripped = normalized.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (stripped && stripped !== normalized && COLUMN_MAP[stripped]) {
    return COLUMN_MAP[stripped];
  }

  // Pass 3: full text joined — matches "masa kerja (bulan)" etc.
  const full = normalizeHeaderFull(header);
  if (full !== normalized && COLUMN_MAP[full]) return COLUMN_MAP[full];

  // Pass 4: full text with trailing parens stripped
  const fullStripped = full.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (fullStripped && fullStripped !== full && COLUMN_MAP[fullStripped]) {
    return COLUMN_MAP[fullStripped];
  }

  return null;
}

function cleanString(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  if (NULL_LITERALS.has(str.toLowerCase())) return null;
  return str;
}

function parseIntegerValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  const cleaned = cleanString(value);
  if (cleaned == null) return null;
  const n = Number.parseInt(cleaned.replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

interface DateParseResult {
  iso: string | null;
  invalid: boolean;
}

function normalizeDateValue(value: unknown): DateParseResult {
  if (value == null) return { iso: null, invalid: false };

  // Excel serial number (xlsx boleh mengembalikan number untuk kolom tanggal).
  if (typeof value === "number") {
    const parsed = parseFlexibleDate(value);
    if (!parsed) return { iso: null, invalid: true };
    return { iso: toISODateString(parsed), invalid: false };
  }

  const cleaned = cleanString(value);
  if (cleaned == null) return { iso: null, invalid: false };

  const parsed = parseFlexibleDate(cleaned);
  if (!parsed) return { iso: null, invalid: true };
  return { iso: toISODateString(parsed), invalid: false };
}

// Normalisasi unit_organisasi: coba exact match, lalu case-insensitive lookup,
// fallback ke nilai asli jika tidak dikenali.
function normalizeUnitOrganisasi(value: string): string {
  if (UNIT_ORGANISASI_NORMALIZE[value]) return UNIT_ORGANISASI_NORMALIZE[value];
  const lower = value.toLowerCase();
  for (const [key, mapped] of Object.entries(UNIT_ORGANISASI_NORMALIZE)) {
    if (key.toLowerCase() === lower) return mapped;
  }
  return value;
}

function createEmptyNormalizedRow(): NormalizedRow {
  return {
    no: null,
    nip: null,
    nik: null,
    nama_lengkap: null,
    jenis_kelamin: null,
    tempat_lahir: null,
    tanggal_lahir: null,
    usia: null,
    alamat: null,
    kota_domisili: null,
    handphone: null,
    email: null,
    status_pegawai: null,
    status_kontrak: null,
    status_kerja: null,
    provider: null,
    lokasi_kerja: null,
    cabang: null,
    kode_organisasi: null,
    unit_organisasi: null,
    nama_organisasi: null,
    sub_unit_organisasi: null,
    nama_jabatan: null,
    unit_kerja_kontrak: null,
    tmt_mulai_kerja: null,
    tmt_berakhir_kerja: null,
    tmt_mulai_jabatan: null,
    tmt_berakhir_jabatan: null,
    tmt_pensiun: null,
    masa_kerja_bulan: null,
    masa_kerja_tahun: null,
    pendidikan: null,
    instansi_pendidikan: null,
    jurusan: null,
    remarks_pendidikan: null,
    tahun_lulus: null,
    kategori_karyawan: null,
    grade: null,
    no_bpjs_kesehatan: null,
    no_bpjs_ketenagakerjaan: null,
    kelompok_jabatan: null,
    kelas_jabatan: null,
    jenis_sepatu: null,
    ukuran_sepatu: null,
    height: null,
    weight: null,
  };
}

// ============================================================================
// parseImportFile — baca .xlsx / .csv, deteksi baris header otomatis,
// kembalikan array row dengan key header asli.
// ============================================================================
export interface ParsedFile {
  headers: string[];
  rows: RawRow[];
}

export async function parseImportFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    raw: true,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return { headers: [], rows: [] };

  // Baca sebagai array of arrays (AoA) agar bisa mendeteksi baris header
  // secara manual. File Excel SDM Gapura Angkasa sering punya baris kosong
  // atau sub-judul sebelum baris header sebenarnya.
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  // Deteksi baris header: cari baris pertama yang memiliki setidaknya 3 sel
  // string non-kosong yang bisa dipetakan ke field dikenali.
  let headerIdx = -1;
  for (let i = 0; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || row.length === 0) continue;
    let recognized = 0;
    for (const cell of row) {
      if (typeof cell === "string" && cell.trim() !== "") {
        if (lookupField(cell)) recognized++;
      }
    }
    if (recognized >= 3) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return { headers: [], rows: [] };

  const rawHeaderRow = aoa[headerIdx] ?? [];
  const rawHeaders: string[] = rawHeaderRow.map((c) =>
    c == null ? "" : String(c),
  );

  const dataRows = aoa.slice(headerIdx + 1);
  const rows: RawRow[] = [];

  for (const row of dataRows) {
    if (!row) continue;
    // Skip baris kosong total.
    const hasAnyValue = row.some(
      (c) => c != null && String(c).trim() !== "",
    );
    if (!hasAnyValue) continue;

    const obj: RawRow = {};
    for (let i = 0; i < rawHeaders.length; i++) {
      const header = rawHeaders[i];
      if (!header) continue;
      obj[header] = row[i] ?? null;
    }
    rows.push(obj);
  }

  return {
    headers: rawHeaders.filter((h) => h !== ""),
    rows,
  };
}

// ============================================================================
// normalizeRow — satu row RawRow -> NormalizedRow + daftar field tanggal
// yang gagal di-parse (untuk dimasukkan sebagai warning).
// ============================================================================
export interface NormalizeRowResult {
  data: NormalizedRow;
  invalidDateFields: string[];
}

export function normalizeRow(raw: RawRow): NormalizeRowResult {
  const data = createEmptyNormalizedRow();
  const invalidDateFields: string[] = [];

  for (const [header, rawValue] of Object.entries(raw)) {
    const field = lookupField(header);
    if (!field) continue;

    if (DATE_FIELDS.has(field)) {
      const result = normalizeDateValue(rawValue);
      // Hanya field tanggal yang punya tipe string | null.
      (data as Record<NormalizedField, unknown>)[field] = result.iso;
      if (result.invalid) invalidDateFields.push(field);
      continue;
    }

    if (INTEGER_FIELDS.has(field)) {
      (data as Record<NormalizedField, unknown>)[field] =
        parseIntegerValue(rawValue);
      continue;
    }

    if (field === "nip" || field === "nik") {
      if (rawValue == null) {
        data[field] = null;
      } else {
        // Excel bisa mem-parse NIP sebagai number, konversi ke string tanpa
        // desimal.
        const str =
          typeof rawValue === "number"
            ? String(Math.trunc(rawValue))
            : String(rawValue).trim();
        data[field] = NULL_LITERALS.has(str.toLowerCase()) ? null : str;
      }
      continue;
    }

    if (field === "email") {
      const s = cleanString(rawValue);
      data.email = s ? s.toLowerCase() : null;
      continue;
    }

    if (field === "unit_organisasi") {
      const s = cleanString(rawValue);
      data.unit_organisasi = s ? normalizeUnitOrganisasi(s) : null;
      continue;
    }

    // Default: clean string.
    (data as Record<NormalizedField, unknown>)[field] = cleanString(rawValue);
  }

  // Derive status_pegawai from status_kontrak if available (PKWT is NOT TAD).
  if (data.status_kontrak) {
    const derived = STATUS_KONTRAK_TO_PEGAWAI[data.status_kontrak];
    if (derived) {
      data.status_pegawai = derived;
    }
  }

  return { data, invalidDateFields };
}

// ============================================================================
// validateRow — aturan validasi per field.
// ============================================================================
function matchCaseInsensitive(
  value: string,
  options: readonly string[],
): string | null {
  const lower = value.toLowerCase();
  for (const opt of options) {
    if (opt.toLowerCase() === lower) return opt;
  }
  return null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRow(
  row: NormalizedRow,
  invalidDateFields: string[],
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Required fields.
  if (!row.nip) {
    errors.push({ field: "nip", message: "NIP wajib diisi" });
  }
  if (!row.nama_lengkap) {
    errors.push({
      field: "nama_lengkap",
      message: "Nama Lengkap wajib diisi",
    });
  }

  if (row.status_pegawai) {
    if (!matchCaseInsensitive(row.status_pegawai, STATUS_PEGAWAI_OPTIONS)) {
      warnings.push({
        field: "status_pegawai",
        message: `Status Pegawai "${row.status_pegawai}" tidak dikenali`,
      });
    }
  }
  if (row.status_kontrak) {
    if (!matchCaseInsensitive(row.status_kontrak, STATUS_KONTRAK_OPTIONS)) {
      warnings.push({
        field: "status_kontrak",
        message: `Status Kontrak "${row.status_kontrak}" tidak dikenali`,
      });
    }
  }
  if (row.status_kerja) {
    if (!matchCaseInsensitive(row.status_kerja, STATUS_KERJA_OPTIONS)) {
      warnings.push({
        field: "status_kerja",
        message: `Status Kerja "${row.status_kerja}" tidak dikenali`,
      });
    }
  }
  if (row.unit_organisasi) {
    if (!matchCaseInsensitive(row.unit_organisasi, UNIT_ORGANISASI_OPTIONS)) {
      warnings.push({
        field: "unit_organisasi",
        message: `Unit Organisasi "${row.unit_organisasi}" tidak dikenali`,
      });
    }
  }
  if (row.provider) {
    if (!matchCaseInsensitive(row.provider, PROVIDER_OPTIONS)) {
      warnings.push({
        field: "provider",
        message: `Provider "${row.provider}" tidak dikenali`,
      });
    }
  }
  if (row.kelompok_jabatan) {
    if (
      !matchCaseInsensitive(row.kelompok_jabatan, KELOMPOK_JABATAN_OPTIONS)
    ) {
      warnings.push({
        field: "kelompok_jabatan",
        message: `Kelompok Jabatan "${row.kelompok_jabatan}" tidak dikenali`,
      });
    }
  }
  if (row.jenis_kelamin) {
    const validValues = JENIS_KELAMIN_OPTIONS.map((o) => o.value);
    if (!validValues.includes(row.jenis_kelamin as "L" | "P")) {
      warnings.push({
        field: "jenis_kelamin",
        message: `Jenis Kelamin harus "L" atau "P"`,
      });
    }
  }
  if (row.email) {
    if (!EMAIL_REGEX.test(row.email)) {
      warnings.push({
        field: "email",
        message: "Format email tidak valid",
      });
    }
  }

  for (const field of invalidDateFields) {
    warnings.push({
      field,
      message: "Format tanggal tidak valid",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// buildImportPreview — bangun ImportPreviewResult dari ParsedFile yang sudah
// di-parse. Dipisah dari parseImportFile agar API route bisa parse sekali,
// query existing NIPs, lalu pass ke fungsi ini tanpa parse ulang.
// ============================================================================
export function buildImportPreview(
  parsed: ParsedFile,
  existingNips: ReadonlySet<string>,
): ImportPreviewResult {
  const previewRows: ImportPreviewRow[] = [];
  const summary: ImportPreviewSummary = {
    totalRows: 0,
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    newCount: 0,
    updateCount: 0,
    skippedCount: 0,
  };

  parsed.rows.forEach((raw, index) => {
    const { data, invalidDateFields } = normalizeRow(raw);

    // Skip row yang tidak punya nama_lengkap sama sekali (biasanya row kosong
    // atau pemisah di file Excel).
    if (!data.nama_lengkap) {
      summary.skippedCount += 1;
      return;
    }

    const validation = validateRow(data, invalidDateFields);
    let status: ImportRowStatus = "valid";
    if (validation.errors.length > 0) status = "error";
    else if (validation.warnings.length > 0) status = "warning";

    const isExistingNip = data.nip ? existingNips.has(data.nip) : false;

    previewRows.push({
      rowNumber: index + 1,
      data,
      validation,
      status,
      isExistingNip,
    });

    summary.totalRows += 1;
    if (status === "valid") summary.validCount += 1;
    else if (status === "warning") summary.warningCount += 1;
    else summary.errorCount += 1;

    if (validation.isValid) {
      if (isExistingNip) summary.updateCount += 1;
      else summary.newCount += 1;
    }
  });

  return {
    rows: previewRows,
    summary,
    headers: parsed.headers,
  };
}

// ============================================================================
// processImportFile — end-to-end helper: parse -> build preview. Tanpa
// existingNips, semua row dianggap NIP baru. API route umumnya pakai
// parseImportFile + buildImportPreview agar bisa cek existing NIP via DB.
// ============================================================================
export async function processImportFile(
  file: File,
  existingNips?: ReadonlySet<string>,
): Promise<ImportPreviewResult> {
  const parsed = await parseImportFile(file);
  return buildImportPreview(parsed, existingNips ?? new Set<string>());
}

// ============================================================================
// Export — generate file .xlsx dari data employee dengan header styled.
// Menggunakan xlsx-js-style (fork SheetJS yang support cell styling) karena
// SheetJS community edition tidak support fill / font color.
// ============================================================================

// Tipe record employee yang dibutuhkan untuk export. Dibuat longgar agar
// konsumen route bisa pass hasil query Drizzle langsung tanpa mapping manual.
export interface ExportEmployeeRecord {
  nip: string | null;
  nik: string | null;
  nama_lengkap: string | null;
  lokasi_kerja: string | null;
  cabang: string | null;
  status_pegawai: string | null;
  status_kontrak: string | null;
  status_kerja: string | null;
  provider: string | null;
  unit_organisasi: string | null;
  kode_organisasi: string | null;
  nama_organisasi: string | null;
  sub_unit_organisasi: string | null;
  nama_jabatan: string | null;
  unit_kerja_kontrak: string | null;
  tmt_mulai_kerja: string | null;
  tmt_mulai_jabatan: string | null;
  tmt_berakhir_jabatan: string | null;
  tmt_berakhir_kerja: string | null;
  masa_kerja_bulan: string | null;
  masa_kerja_tahun: string | null;
  jenis_kelamin: string | null;
  jenis_sepatu: string | null;
  ukuran_sepatu: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  usia: number | null;
  kota_domisili: string | null;
  alamat: string | null;
  pendidikan: string | null;
  instansi_pendidikan: string | null;
  jurusan: string | null;
  remarks_pendidikan: string | null;
  tahun_lulus: number | null;
  handphone: string | null;
  email: string | null;
  kategori_karyawan: string | null;
  tmt_pensiun: string | null;
  grade: string | null;
  no_bpjs_kesehatan: string | null;
  no_bpjs_ketenagakerjaan: string | null;
  kelompok_jabatan: string | null;
  kelas_jabatan: string | null;
  weight: number | null;
  height: number | null;
}

type ExportField = keyof ExportEmployeeRecord;

interface ExportColumnDef {
  header: string;
  field: ExportField | "no_urut";
  isDate?: boolean;
}

// 45 kolom — urutan & label persis mengikuti template import agar file
// hasil export kompatibel jika di-import kembali.
const EXPORT_COLUMNS_ALL: readonly ExportColumnDef[] = [
  { header: "NO", field: "no_urut" },
  { header: "NIP", field: "nip" },
  { header: "KTP / NIK", field: "nik" },
  { header: "NAMA LENGKAP", field: "nama_lengkap" },
  { header: "LOKASI KERJA", field: "lokasi_kerja" },
  { header: "CABANG", field: "cabang" },
  { header: "STATUS PEGAWAI", field: "status_pegawai" },
  { header: "STATUS KONTRAK", field: "status_kontrak" },
  { header: "STATUS KERJA", field: "status_kerja" },
  { header: "PROVIDER", field: "provider" },
  { header: "UNIT ORGANISASI", field: "unit_organisasi" },
  { header: "KODE ORGANISASI", field: "kode_organisasi" },
  { header: "NAMA ORGANISASI", field: "nama_organisasi" },
  { header: "SUB UNIT ORGANISASI", field: "sub_unit_organisasi" },
  { header: "NAMA JABATAN", field: "nama_jabatan" },
  { header: "UNIT KERJA SESUAI KONTRAK", field: "unit_kerja_kontrak" },
  { header: "TMT MULAI KERJA", field: "tmt_mulai_kerja", isDate: true },
  { header: "TMT MULAI JABATAN", field: "tmt_mulai_jabatan", isDate: true },
  { header: "TMT BERAKHIR JABATAN", field: "tmt_berakhir_jabatan", isDate: true },
  { header: "TMT BERAKHIR KERJA", field: "tmt_berakhir_kerja", isDate: true },
  { header: "MASA KERJA (BULAN)", field: "masa_kerja_bulan" },
  { header: "MASA KERJA (TAHUN)", field: "masa_kerja_tahun" },
  { header: "JENIS KELAMIN", field: "jenis_kelamin" },
  { header: "JENIS SEPATU", field: "jenis_sepatu" },
  { header: "UKURAN SEPATU", field: "ukuran_sepatu" },
  { header: "TEMPAT LAHIR", field: "tempat_lahir" },
  { header: "TANGGAL LAHIR", field: "tanggal_lahir", isDate: true },
  { header: "USIA", field: "usia" },
  { header: "KOTA DOMISILI", field: "kota_domisili" },
  { header: "ALAMAT", field: "alamat" },
  { header: "PENDIDIKAN", field: "pendidikan" },
  { header: "NAMA INSTANSI PENDIDIKAN", field: "instansi_pendidikan" },
  { header: "JURUSAN", field: "jurusan" },
  { header: "REMARKS PENDIDIKAN", field: "remarks_pendidikan" },
  { header: "TAHUN LULUS", field: "tahun_lulus" },
  { header: "HANDPHONE", field: "handphone" },
  { header: "KATEGORI KARYAWAN", field: "kategori_karyawan" },
  { header: "TMT PENSIUN", field: "tmt_pensiun", isDate: true },
  { header: "GRADE", field: "grade" },
  { header: "NO BPJS KESEHATAN", field: "no_bpjs_kesehatan" },
  { header: "NO BPJS KETENAGAKERJAAN", field: "no_bpjs_ketenagakerjaan" },
  { header: "KELOMPOK JABATAN", field: "kelompok_jabatan" },
  { header: "KELAS JABATAN", field: "kelas_jabatan" },
  { header: "WEIGHT", field: "weight" },
  { header: "HEIGHT", field: "height" },
];

// 15 kolom dasar — untuk keperluan laporan ringkas.
const EXPORT_COLUMNS_BASIC: readonly ExportColumnDef[] = [
  { header: "NO", field: "no_urut" },
  { header: "NIP", field: "nip" },
  { header: "NIK", field: "nik" },
  { header: "NAMA LENGKAP", field: "nama_lengkap" },
  { header: "JENIS KELAMIN", field: "jenis_kelamin" },
  { header: "STATUS PEGAWAI", field: "status_pegawai" },
  { header: "STATUS KONTRAK", field: "status_kontrak" },
  { header: "STATUS KERJA", field: "status_kerja" },
  { header: "PROVIDER", field: "provider" },
  { header: "UNIT ORGANISASI", field: "unit_organisasi" },
  { header: "NAMA JABATAN", field: "nama_jabatan" },
  { header: "HANDPHONE", field: "handphone" },
  { header: "EMAIL", field: "email" },
  { header: "TMT MULAI KERJA", field: "tmt_mulai_kerja", isDate: true },
  { header: "TMT BERAKHIR KERJA", field: "tmt_berakhir_kerja", isDate: true },
];

export type ExportColumnSet = "all" | "basic";

export interface GenerateExportOptions {
  sheetName?: string;
  columns?: ExportColumnSet;
}

// Helper: convert nilai field ke cell value untuk worksheet. Null/undefined
// selalu jadi string kosong. Tanggal di-format DD/MM/YYYY via WITA timezone.
function toCellValue(
  record: ExportEmployeeRecord,
  column: ExportColumnDef,
  rowIndex: number,
): string | number {
  if (column.field === "no_urut") return rowIndex + 1;

  const raw = record[column.field];
  if (raw == null) return "";

  if (column.isDate) {
    if (typeof raw !== "string") return "";
    const formatted = formatDateWITA(raw, "dd/MM/yyyy");
    return formatted || "";
  }

  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : "";
  }

  return String(raw);
}

export function generateExportExcel(
  employees: ReadonlyArray<ExportEmployeeRecord>,
  options: GenerateExportOptions = {},
): ArrayBuffer {
  const columnSet: ExportColumnSet = options.columns ?? "all";

  // For "basic" mode, use the simplified column list with old-style layout.
  if (columnSet === "basic") {
    return generateBasicExport(employees);
  }

  // Full export: use EXCEL_COLUMNS (45 cols) with new layout.
  const sheetName = "DATABASE SDM";
  const headerStyle = getHeaderCellStyle();
  const totalDataRows = employees.length;
  const totalRows = totalDataRows + 2; // row 0 spacer + row 1 header + data
  const totalCols = EXCEL_COLUMNS.length;

  const ws: XLSXStyle.WorkSheet = {};
  ws["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: totalRows - 1, c: totalCols - 1 },
  );

  // Row 0: empty spacer
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSXStyle.utils.encode_cell({ r: 0, c });
    ws[addr] = { v: "", t: "s", s: {} };
  }

  // Row 1: styled header with multi-line text
  for (let c = 0; c < totalCols; c++) {
    const col = EXCEL_COLUMNS[c]!;
    const addr = XLSXStyle.utils.encode_cell({ r: 1, c });
    ws[addr] = { v: buildHeaderCellText(col), t: "s", s: headerStyle };
  }

  // Row 2+: data
  for (let rowIdx = 0; rowIdx < totalDataRows; rowIdx++) {
    const record = employees[rowIdx]!;
    for (let c = 0; c < totalCols; c++) {
      const col = EXCEL_COLUMNS[c]!;
      const cellStyle = getDataCellStyle(col.key);

      let value: string | number = "";
      if (col.key === "no") {
        value = rowIdx + 1;
      } else {
        const fieldKey = col.key as keyof ExportEmployeeRecord;
        const raw = record[fieldKey];
        if (raw == null) {
          value = "";
        } else if (col.isDate && typeof raw === "string") {
          value = formatDateWITA(raw, "dd/MM/yyyy") || "";
        } else if (typeof raw === "number") {
          value = Number.isFinite(raw) ? raw : "";
        } else {
          value = String(raw);
        }
      }

      const addr = XLSXStyle.utils.encode_cell({ r: rowIdx + 2, c });
      ws[addr] = {
        v: value,
        t: typeof value === "number" ? "n" : "s",
        s: cellStyle,
      };
    }
  }

  setColumnWidths(ws);
  setRowHeights(ws);
  ws["!freeze"] = { xSplit: 0, ySplit: 2 };

  const workbook = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(workbook, ws, sheetName);

  return XLSXStyle.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellStyles: true,
  }) as ArrayBuffer;
}

/** Basic export (15 columns) — simpler layout, header on row 0. */
function generateBasicExport(
  employees: ReadonlyArray<ExportEmployeeRecord>,
): ArrayBuffer {
  const columns = EXPORT_COLUMNS_BASIC;
  const headerStyle = getHeaderCellStyle();
  const totalRows = employees.length + 1;
  const totalCols = columns.length;

  const ws: XLSXStyle.WorkSheet = {};
  ws["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: totalRows - 1, c: totalCols - 1 },
  );

  // Row 0: header
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSXStyle.utils.encode_cell({ r: 0, c });
    ws[addr] = { v: columns[c]!.header, t: "s", s: headerStyle };
  }

  // Row 1+: data
  employees.forEach((record, rowIdx) => {
    for (let c = 0; c < totalCols; c++) {
      const col = columns[c]!;
      const value = toCellValue(record, col, rowIdx);
      const cellStyle = getDataCellStyle(col.field === "no_urut" ? "no" : col.field);
      const addr = XLSXStyle.utils.encode_cell({ r: rowIdx + 1, c });
      ws[addr] = {
        v: value,
        t: typeof value === "number" ? "n" : "s",
        s: cellStyle,
      };
    }
  });

  ws["!cols"] = columns.map((col) => ({
    wch: Math.min(Math.max(col.header.length + 2, 10), 40),
  }));
  ws["!rows"] = [{ hpt: 24 }];
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  const workbook = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(workbook, ws, "Data SDM");

  return XLSXStyle.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellStyles: true,
  }) as ArrayBuffer;
}

// ============================================================================
// generateImportTemplate — buat file .xlsx template dengan 45 kolom header,
// styled header hijau, dan sheet panduan.
// ============================================================================
export function generateImportTemplate(): ArrayBuffer {
  const headerStyle = getHeaderCellStyle();
  const totalCols = EXCEL_COLUMNS.length;

  // --- Sheet 1: DATABASE SDM ---
  const ws: XLSXStyle.WorkSheet = {};
  // Range: row 0 (spacer) + row 1 (header) + rows 2-101 (empty data area)
  ws["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: 101, c: totalCols - 1 },
  );

  // Row 0: empty spacer
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSXStyle.utils.encode_cell({ r: 0, c });
    ws[addr] = { v: "", t: "s", s: {} };
  }

  // Row 1: styled header
  for (let c = 0; c < totalCols; c++) {
    const col = EXCEL_COLUMNS[c]!;
    const addr = XLSXStyle.utils.encode_cell({ r: 1, c });
    ws[addr] = { v: buildHeaderCellText(col), t: "s", s: headerStyle };
  }

  setColumnWidths(ws);
  setRowHeights(ws);
  ws["!freeze"] = { xSplit: 0, ySplit: 2 };

  // --- Sheet 2: PANDUAN ---
  const guideStyle = {
    font: { name: "Arial", sz: 11 },
  };
  const guideBoldStyle = {
    font: { name: "Arial", sz: 11, bold: true },
  };
  const guideTitleStyle = {
    font: { name: "Arial", sz: 14, bold: true },
  };

  const guideWs: XLSXStyle.WorkSheet = {};
  const guideLines: Array<{ row: number; text: string; style: unknown }> = [
    { row: 0, text: "PANDUAN PENGISIAN TEMPLATE IMPORT DATA SDM", style: guideTitleStyle },
    { row: 2, text: "Aturan Umum:", style: guideBoldStyle },
    { row: 3, text: "1. Isi data mulai dari baris ke-3 (di bawah header hijau)", style: guideStyle },
    { row: 4, text: "2. Kolom NIP dan NAMA LENGKAP wajib diisi", style: guideStyle },
    { row: 5, text: "3. Format tanggal: dd/mm/yyyy (contoh: 01/05/2025)", style: guideStyle },
    { row: 6, text: "4. Jenis Kelamin: L (Laki-laki) atau P (Perempuan)", style: guideStyle },
    { row: 7, text: "5. Status Pegawai: PEGAWAI TETAP, PKWT, atau TAD", style: guideStyle },
    { row: 8, text: "6. Status Kontrak: PEGAWAI TETAP, PKWT, PAKET SDM, atau PAKET PEKERJAAN", style: guideStyle },
    { row: 9, text: "7. Status Kerja: Aktif atau Non Aktif", style: guideStyle },
    { row: 10, text: "8. Lokasi Kerja selalu: Bandar Udara Ngurah Rai", style: guideStyle },
    { row: 11, text: "9. Cabang selalu: DPS", style: guideStyle },
    { row: 12, text: "10. Jika NIP sudah ada di sistem, data akan di-UPDATE (bukan duplikat)", style: guideStyle },
    { row: 13, text: "11. Setiap karyawan yang berhasil di-import otomatis mendapat akun login (NIP = password)", style: guideStyle },
    { row: 15, text: "Daftar Provider:", style: guideBoldStyle },
  ];

  // Add provider list
  PROVIDER_OPTIONS.forEach((provider, idx) => {
    guideLines.push({
      row: 16 + idx,
      text: `${idx + 1}. ${provider}`,
      style: guideStyle,
    });
  });

  const unitOrgStart = 16 + PROVIDER_OPTIONS.length + 1;
  guideLines.push({
    row: unitOrgStart,
    text: "Daftar Unit Organisasi:",
    style: guideBoldStyle,
  });

  const unitList = [
    "Airside (MO)", "Landside (ME)", "GSE (MF)", "GH (MS)",
    "Back Office (MU, MK)", "Ancillary (MB)", "Avsec (MQ)", "EGM", "GM",
  ];
  unitList.forEach((unit, idx) => {
    guideLines.push({
      row: unitOrgStart + 1 + idx,
      text: `${idx + 1}. ${unit}`,
      style: guideStyle,
    });
  });

  const maxRow = guideLines[guideLines.length - 1]!.row;
  guideWs["!ref"] = XLSXStyle.utils.encode_range(
    { r: 0, c: 0 },
    { r: maxRow, c: 0 },
  );
  guideWs["!cols"] = [{ wch: 80 }];

  for (const line of guideLines) {
    const addr = XLSXStyle.utils.encode_cell({ r: line.row, c: 0 });
    guideWs[addr] = { v: line.text, t: "s", s: line.style };
  }

  // Build workbook
  const workbook = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(workbook, ws, "DATABASE SDM");
  XLSXStyle.utils.book_append_sheet(workbook, guideWs, "PANDUAN");

  return XLSXStyle.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellStyles: true,
  }) as ArrayBuffer;
}
