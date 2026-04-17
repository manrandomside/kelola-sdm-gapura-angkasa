export const TOAST_MESSAGES = {
  // Success
  EMPLOYEE_CREATED: "Karyawan berhasil ditambahkan",
  EMPLOYEE_UPDATED: "Perubahan berhasil disimpan",
  EMPLOYEE_DELETED: "Data karyawan berhasil dihapus",
  IMPORT_SUCCESS: "Import data berhasil",
  EXPORT_SUCCESS: "File berhasil diunduh",
  TEMPLATE_DOWNLOADED: "Template berhasil diunduh",
  USER_CREATED: "Pengguna berhasil ditambahkan",
  USER_UPDATED: "Data pengguna berhasil diperbarui",
  USER_DEACTIVATED: "Pengguna berhasil dinonaktifkan",
  PASSWORD_CHANGED: "Password berhasil diubah",
  PASSWORD_RESET: "Password berhasil direset ke NIP",
  REPORT_DOWNLOADED: "Laporan berhasil di-download",

  // Error
  GENERIC_ERROR: "Terjadi kesalahan",
  NETWORK_ERROR: "Koneksi bermasalah",
  VALIDATION_ERROR: "Data tidak valid",
  UNAUTHORIZED: "Sesi Anda telah berakhir",
  FORBIDDEN: "Anda tidak memiliki akses",
  NOT_FOUND: "Data tidak ditemukan",
  FORM_INCOMPLETE: "Mohon lengkapi field yang wajib diisi",
} as const;
