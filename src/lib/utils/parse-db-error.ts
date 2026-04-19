export type DatabaseErrorCode =
  | "DUPLICATE_NIK"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_NIP"
  | "INVALID_FORMAT"
  | "MISSING_FIELD"
  | "INVALID_ENUM"
  | "AUTH_ERROR"
  | "UNKNOWN";

export interface ParsedError {
  code: DatabaseErrorCode;
  field?: string;
  value?: string;
  message: string;
  detail?: string;
  suggestion?: string;
}

export const ERROR_CODE_LABEL: Record<DatabaseErrorCode, string> = {
  DUPLICATE_NIK: "NIK Duplikat",
  DUPLICATE_EMAIL: "Email Duplikat",
  DUPLICATE_NIP: "NIP Duplikat",
  INVALID_FORMAT: "Format Salah",
  MISSING_FIELD: "Field Kosong",
  INVALID_ENUM: "Nilai Tidak Valid",
  AUTH_ERROR: "Error Akun",
  UNKNOWN: "Lainnya",
};

export function getErrorLabel(code: string): string {
  if (code in ERROR_CODE_LABEL) {
    return ERROR_CODE_LABEL[code as DatabaseErrorCode];
  }
  return ERROR_CODE_LABEL.UNKNOWN;
}

function extractValueFromError(
  errorMessage: string,
  field: string,
): string | null {
  const regex = new RegExp(`\\(${field}\\)=\\(([^)]+)\\)`, "i");
  const match = errorMessage.match(regex);
  return match ? match[1]! : null;
}

export function parseDatabaseError(
  error: unknown,
  rowData?: Record<string, unknown>,
): ParsedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  if (errorLower.includes("duplicate key") && errorLower.includes("nik")) {
    const nikValue =
      (rowData?.nik as string | undefined) ??
      extractValueFromError(errorMessage, "nik") ??
      "";
    return {
      code: "DUPLICATE_NIK",
      field: "nik",
      value: String(nikValue),
      message: `NIK "${nikValue}" sudah terdaftar`,
      detail:
        "NIK ini sudah digunakan oleh karyawan lain di sistem atau di file yang sama.",
      suggestion:
        "Periksa file, pastikan tidak ada NIK duplikat. Jika di sistem sudah ada, hapus atau update data lama.",
    };
  }

  if (errorLower.includes("duplicate key") && errorLower.includes("email")) {
    const emailValue =
      (rowData?.email as string | undefined) ??
      extractValueFromError(errorMessage, "email") ??
      "";
    return {
      code: "DUPLICATE_EMAIL",
      field: "email",
      value: String(emailValue),
      message: `Email "${emailValue}" sudah terdaftar`,
      detail:
        "Email ini sudah digunakan oleh karyawan lain atau akun login lain.",
      suggestion: "Gunakan email yang berbeda, atau kosongkan field email.",
    };
  }

  if (errorLower.includes("duplicate key") && errorLower.includes("nip")) {
    const nipValue = (rowData?.nip as string | undefined) ?? "";
    return {
      code: "DUPLICATE_NIP",
      field: "nip",
      value: String(nipValue),
      message: `NIP "${nipValue}" sudah terdaftar`,
      detail: "NIP ini sudah ada di sistem.",
      suggestion:
        "Jika ingin update data, gunakan fitur update. Jika NIP duplikat di file, perbaiki dulu filenya.",
    };
  }

  if (
    errorLower.includes("user already") ||
    errorLower.includes("email rate limit") ||
    errorLower.includes("gagal membuat akun auth") ||
    errorLower.includes("auth user") ||
    (errorLower.includes("auth") && errorLower.includes("already"))
  ) {
    return {
      code: "AUTH_ERROR",
      message: "Gagal membuat akun login",
      detail:
        "Email untuk akun login sudah digunakan, atau terjadi masalah saat membuat akun di sistem authentication.",
      suggestion:
        "Data karyawan mungkin tetap bisa masuk. Coba import ulang atau hubungi administrator.",
    };
  }

  if (
    errorLower.includes("invalid input syntax") &&
    (errorLower.includes("date") || errorLower.includes("timestamp"))
  ) {
    return {
      code: "INVALID_FORMAT",
      field: "tanggal",
      message: "Format tanggal tidak valid",
      detail:
        "Salah satu field tanggal memiliki format yang tidak bisa dibaca oleh sistem.",
      suggestion: "Gunakan format DD/MM/YYYY, YYYY-MM-DD, atau DD-MM-YYYY.",
    };
  }

  if (
    errorLower.includes("invalid input syntax") &&
    (errorLower.includes("integer") || errorLower.includes("numeric"))
  ) {
    return {
      code: "INVALID_FORMAT",
      field: "angka",
      message: "Format angka tidak valid",
      detail:
        "Salah satu field angka (usia, tahun lulus, berat, tinggi, ukuran sepatu) memiliki nilai yang tidak bisa dibaca sebagai angka.",
      suggestion: "Pastikan field angka hanya berisi angka, bukan teks.",
    };
  }

  if (
    errorLower.includes("null value in column") ||
    errorLower.includes("violates not-null")
  ) {
    const fieldMatch = errorMessage.match(/column "([^"]+)"/);
    const field = fieldMatch ? fieldMatch[1]! : "field wajib";
    return {
      code: "MISSING_FIELD",
      field,
      message: `Field wajib "${field}" kosong`,
      detail: `Kolom ${field} tidak boleh kosong tapi tidak ada nilai di row ini.`,
      suggestion: `Isi field ${field} di file sumber.`,
    };
  }

  if (
    errorLower.includes("check constraint") ||
    errorLower.includes("violates check")
  ) {
    return {
      code: "INVALID_ENUM",
      message: "Nilai tidak sesuai pilihan yang diizinkan",
      detail:
        "Salah satu field (status_pegawai, jenis_kelamin, status_kontrak, dll) memiliki nilai yang tidak ada di daftar pilihan valid.",
      suggestion: "Cek daftar nilai valid di sheet PANDUAN di template Excel.",
    };
  }

  if (
    errorLower.includes("value too long") ||
    errorLower.includes("character varying")
  ) {
    return {
      code: "INVALID_FORMAT",
      message: "Nilai melebihi panjang maksimum kolom",
      detail: "Salah satu field memiliki teks yang lebih panjang dari batas kolom.",
      suggestion: "Persingkat nilai di field terkait.",
    };
  }

  return {
    code: "UNKNOWN",
    message: "Terjadi kesalahan saat menyimpan data",
    detail:
      errorMessage.length > 200
        ? errorMessage.substring(0, 200) + "..."
        : errorMessage,
    suggestion:
      "Periksa data row ini secara manual atau hubungi administrator.",
  };
}
