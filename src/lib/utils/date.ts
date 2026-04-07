import { format, parse, parseISO, isValid } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

// Seluruh timestamp disimpan dalam UTC dan ditampilkan dalam timezone
// Asia/Makassar (WITA, UTC+8). Utility ini adalah satu-satunya sumber
// kebenaran untuk konversi timezone di sisi aplikasi.
export const APP_TIMEZONE = "Asia/Makassar";

type DateLike = Date | string | number;

function toDate(value: DateLike): Date | null {
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const iso = parseISO(value);
    if (isValid(iso)) return iso;
    const fallback = new Date(value);
    return isValid(fallback) ? fallback : null;
  }
  return null;
}

// Format sebuah tanggal ke timezone WITA. Default output 'dd/MM/yyyy'.
export function formatDateWITA(
  value: DateLike | null | undefined,
  pattern: string = "dd/MM/yyyy",
): string {
  if (value == null) return "";
  const date = toDate(value);
  if (!date) return "";
  return formatInTimeZone(date, APP_TIMEZONE, pattern);
}

// Format tanggal + waktu WITA, dengan suffix "WITA".
export function formatDateTimeWITA(
  value: DateLike | null | undefined,
): string {
  if (value == null) return "";
  const date = toDate(value);
  if (!date) return "";
  return `${formatInTimeZone(date, APP_TIMEZONE, "dd/MM/yyyy HH:mm")} WITA`;
}

// CSV sumber memiliki format tanggal campuran: DD/MM/YYYY, YYYY-MM-DD,
// DD-MM-YYYY, plus Excel serial number. Fungsi ini menormalkan semuanya
// menjadi Date. Mengembalikan null untuk input kosong / tidak valid.
export function parseFlexibleDate(
  input: string | number | null | undefined,
): Date | null {
  if (input == null) return null;

  // Excel serial number (number langsung atau string numerik murni).
  if (typeof input === "number") {
    return excelSerialToDate(input);
  }

  const raw = String(input).trim();
  if (!raw || raw === "-" || raw === "?") return null;

  // Angka murni -> Excel serial date.
  if (/^\d+(\.\d+)?$/.test(raw)) {
    return excelSerialToDate(Number(raw));
  }

  // Coba ISO terlebih dahulu (YYYY-MM-DD atau full ISO timestamp).
  const iso = parseISO(raw);
  if (isValid(iso)) return iso;

  const patterns = [
    "dd/MM/yyyy",
    "d/M/yyyy",
    "dd-MM-yyyy",
    "d-M-yyyy",
    "yyyy/MM/dd",
    "yyyy-MM-dd",
    "dd.MM.yyyy",
    "d.M.yyyy",
  ];

  const reference = new Date();
  for (const pattern of patterns) {
    const parsed = parse(raw, pattern, reference);
    if (isValid(parsed)) return parsed;
  }

  const fallback = new Date(raw);
  return isValid(fallback) ? fallback : null;
}

// Excel menyimpan tanggal sebagai jumlah hari sejak 1899-12-30 (quirk
// kompatibilitas dengan Lotus 1-2-3). Konversi dilakukan manual agar
// tidak bergantung pada library tambahan.
function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + Math.round(serial * 86400000);
  const d = new Date(ms);
  return isValid(d) ? d : null;
}

// Helper untuk mengubah Date menjadi ISO date string (YYYY-MM-DD) —
// berguna saat menyimpan field tipe DATE di Postgres.
export function toISODateString(
  value: DateLike | null | undefined,
): string | null {
  if (value == null) return null;
  const date = toDate(value);
  if (!date) return null;
  return format(date, "yyyy-MM-dd");
}
