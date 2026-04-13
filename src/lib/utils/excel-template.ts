import * as XLSXStyle from "xlsx-js-style";

// ============================================================================
// Shared Excel template definitions used by both import template and export.
// ============================================================================

export interface ExcelColumnDef {
  /** Database field key (or 'no' for row number). */
  key: string;
  /** Primary header text (uppercase). */
  header: string;
  /** Optional sub-header hint shown in parentheses below the header. */
  subHeader?: string;
  /** Column width in characters. */
  width: number;
  /** Whether this field holds a date value. */
  isDate?: boolean;
}

/**
 * 45 columns in the exact order matching the company Google Sheets template.
 * Used for both import template generation and export formatting.
 */
export const EXCEL_COLUMNS: readonly ExcelColumnDef[] = [
  { key: "no", header: "NO", width: 5 },
  { key: "nip", header: "NIP", width: 15 },
  { key: "nik", header: "KTP / NIK", width: 20 },
  { key: "nama_lengkap", header: "NAMA LENGKAP", width: 35 },
  {
    key: "lokasi_kerja",
    header: "LOKASI KERJA",
    subHeader: "(Bandar Udara Ngurah Rai)",
    width: 25,
  },
  { key: "cabang", header: "CABANG", subHeader: "(DPS)", width: 8 },
  {
    key: "status_pegawai",
    header: "STATUS PEGAWAI",
    subHeader: "(PEGAWAI TETAP/\nPKWT / TAD)",
    width: 20,
  },
  {
    key: "status_kontrak",
    header: "STATUS KONTRAK",
    subHeader: "(PEGAWAI TETAP/PAKET PEKERJAAN/\nPKWT/PAKET SDM)",
    width: 22,
  },
  {
    key: "status_kerja",
    header: "STATUS KERJA",
    subHeader: "(Aktif/Non Aktif)",
    width: 15,
  },
  {
    key: "provider",
    header: "PROVIDER",
    subHeader: "(NAMA PROVIDER)",
    width: 30,
  },
  {
    key: "unit_organisasi",
    header: "UNIT ORGANISASI",
    subHeader: "(AIRSIDE, LANDSIDE, GSE, GH,\nBACK OFFICE, Ancillary,\nAvsec, EGM, GM)",
    width: 18,
  },
  {
    key: "kode_organisasi",
    header: "KODE ORGANISASI",
    subHeader: "(MO/ME/MF/MS/MU/MK/\nMQ/MB/EGM/GM)",
    width: 18,
  },
  {
    key: "nama_organisasi",
    header: "NAMA ORGANISASI",
    subHeader:
      "((Operation Services), (GA, QG MPL\nServices), (MPA, Unschedule & Charter\nServices), (Safety, Security And Quality\nControl), (GSE Operation &\nMaintenance), (Finance), (HR & GA,\nAncillary))",
    width: 35,
  },
  {
    key: "sub_unit_organisasi",
    header: "SUB UNIT ORGANISASI",
    subHeader: "(Lokasi Kerja)",
    width: 25,
  },
  {
    key: "nama_jabatan",
    header: "NAMA JABATAN",
    subHeader: "(POSISI SAAT INI)",
    width: 30,
  },
  { key: "unit_kerja_kontrak", header: "UNIT KERJA SESUAI KONTRAK", width: 25 },
  {
    key: "tmt_mulai_kerja",
    header: "TMT MULAI KERJA",
    subHeader: "(dd/mm/yyyy)",
    width: 18,
    isDate: true,
  },
  { key: "tmt_mulai_jabatan", header: "TMT MULAI JABATAN", width: 18, isDate: true },
  { key: "tmt_berakhir_jabatan", header: "TMT BERAKHIR JABATAN", width: 20, isDate: true },
  { key: "tmt_berakhir_kerja", header: "TMT BERAKHIR KERJA", width: 20, isDate: true },
  {
    key: "masa_kerja_bulan",
    header: "MASA KERJA",
    subHeader: "(BULAN)",
    width: 15,
  },
  {
    key: "masa_kerja_tahun",
    header: "MASA KERJA",
    subHeader: "(TAHUN)",
    width: 15,
  },
  {
    key: "jenis_kelamin",
    header: "JENIS KELAMIN",
    subHeader: "(L / P)",
    width: 15,
  },
  {
    key: "jenis_sepatu",
    header: "JENIS SEPATU",
    subHeader: "(Pantofel / Safety Shoes)",
    width: 22,
  },
  { key: "ukuran_sepatu", header: "UKURAN SEPATU", width: 15 },
  { key: "tempat_lahir", header: "TEMPAT LAHIR", width: 20 },
  { key: "tanggal_lahir", header: "TANGGAL LAHIR", width: 18, isDate: true },
  { key: "usia", header: "USIA", width: 8 },
  { key: "kota_domisili", header: "KOTA DOMISILI", width: 20 },
  { key: "alamat", header: "ALAMAT", width: 40 },
  { key: "pendidikan", header: "PENDIDIKAN", width: 25 },
  { key: "instansi_pendidikan", header: "NAMA INSTANSI PENDIDIKAN", width: 30 },
  { key: "jurusan", header: "JURUSAN", width: 25 },
  { key: "remarks_pendidikan", header: "REMARKS PENDIDIKAN", width: 20 },
  { key: "tahun_lulus", header: "TAHUN LULUS", width: 12 },
  { key: "handphone", header: "HANDPHONE", width: 18 },
  { key: "kategori_karyawan", header: "KATEGORI KARYAWAN", width: 20 },
  { key: "tmt_pensiun", header: "TMT PENSIUN", width: 18, isDate: true },
  { key: "grade", header: "GRADE", width: 10 },
  { key: "no_bpjs_kesehatan", header: "NO BPJS KESEHATAN", width: 20 },
  { key: "no_bpjs_ketenagakerjaan", header: "NO BPJS KETENAGAKERJAAN", width: 22 },
  { key: "kelompok_jabatan", header: "KELOMPOK JABATAN", width: 25 },
  { key: "kelas_jabatan", header: "KELAS JABATAN", width: 20 },
  { key: "weight", header: "WEIGHT", width: 10 },
  { key: "height", header: "HEIGHT", width: 10 },
] as const;

// ============================================================================
// Styling constants
// ============================================================================

const HEADER_CELL_STYLE = {
  font: { name: "Arial", bold: true, color: { rgb: "FFFFFFFF" }, sz: 11 },
  fill: { patternType: "solid" as const, fgColor: { rgb: "FF439454" } },
  alignment: {
    horizontal: "center" as const,
    vertical: "center" as const,
    wrapText: true,
  },
  border: {
    top: { style: "thin" as const, color: { rgb: "FF2D5A37" } },
    bottom: { style: "thin" as const, color: { rgb: "FF2D5A37" } },
    left: { style: "thin" as const, color: { rgb: "FF2D5A37" } },
    right: { style: "thin" as const, color: { rgb: "FF2D5A37" } },
  },
};

const DATA_CELL_STYLE = {
  font: { name: "Arial", sz: 10 },
  alignment: { vertical: "center" as const, wrapText: false },
  border: {
    top: { style: "thin" as const, color: { rgb: "FFE5E7EB" } },
    bottom: { style: "thin" as const, color: { rgb: "FFE5E7EB" } },
    left: { style: "thin" as const, color: { rgb: "FFE5E7EB" } },
    right: { style: "thin" as const, color: { rgb: "FFE5E7EB" } },
  },
};

const DATA_CENTER_STYLE = {
  ...DATA_CELL_STYLE,
  alignment: {
    horizontal: "center" as const,
    vertical: "center" as const,
    wrapText: false,
  },
};

// Fields that should be center-aligned in data rows.
const CENTER_FIELDS = new Set([
  "no",
  "nip",
  "nik",
  "cabang",
  "status_pegawai",
  "status_kontrak",
  "status_kerja",
  "kode_organisasi",
  "jenis_kelamin",
  "jenis_sepatu",
  "ukuran_sepatu",
  "usia",
  "tahun_lulus",
  "grade",
  "weight",
  "height",
  "masa_kerja_bulan",
  "masa_kerja_tahun",
  "tmt_mulai_kerja",
  "tmt_mulai_jabatan",
  "tmt_berakhir_jabatan",
  "tmt_berakhir_kerja",
  "tmt_pensiun",
  "tanggal_lahir",
]);

/**
 * Build the full header cell text: header + subHeader merged with newline.
 */
export function buildHeaderCellText(col: ExcelColumnDef): string {
  if (col.subHeader) {
    return `${col.header}\n${col.subHeader}`;
  }
  return col.header;
}

/**
 * Get the appropriate data cell style for a given column key.
 */
export function getDataCellStyle(key: string): typeof DATA_CELL_STYLE {
  return CENTER_FIELDS.has(key) ? DATA_CENTER_STYLE : DATA_CELL_STYLE;
}

/**
 * Return the header cell style.
 */
export function getHeaderCellStyle(): typeof HEADER_CELL_STYLE {
  return HEADER_CELL_STYLE;
}

/**
 * Apply column widths from EXCEL_COLUMNS to a worksheet.
 */
export function setColumnWidths(
  ws: XLSXStyle.WorkSheet,
  columns: readonly ExcelColumnDef[] = EXCEL_COLUMNS,
): void {
  ws["!cols"] = columns.map((col) => ({ wch: col.width }));
}

/**
 * Apply row heights for the template layout:
 * Row 0 (empty spacer) = 20pt, Row 1 (header) = auto-fit (~100pt for multi-line).
 */
export function setRowHeights(ws: XLSXStyle.WorkSheet, headerRow: number = 1): void {
  if (!ws["!rows"]) ws["!rows"] = [];
  // Spacer row
  ws["!rows"][0] = { hpt: 20 };
  // Header row — tall enough for multi-line content
  ws["!rows"][headerRow] = { hpt: 100 };
}
