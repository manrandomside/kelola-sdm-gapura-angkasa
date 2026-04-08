import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import {
  buildImportPreview,
  normalizeRow,
  parseImportFile,
} from "@/lib/utils/excel";

import type { ApiResponse } from "@/types/api";
import type { ImportPreviewResult } from "@/lib/utils/excel";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".xlsx", ".csv"];
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/x-csv",
  "application/octet-stream", // beberapa browser kirim octet-stream untuk .xlsx
]);

function fail(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message } },
    { status },
  );
}

function hasAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<ImportPreviewResult>>> {
  // Auth: hanya admin / super_admin yang boleh import.
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const appUserRows = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.supabase_auth_id, authUser.id))
    .limit(1);

  const appUser = appUserRows[0];
  if (!appUser) {
    return fail(403, "FORBIDDEN", "Akun tidak terdaftar");
  }
  if (appUser.role !== "admin" && appUser.role !== "super_admin") {
    return fail(
      403,
      "FORBIDDEN",
      "Anda tidak memiliki akses untuk import data",
    );
  }

  // Parse FormData.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(400, "INVALID_BODY", "Request body tidak valid");
  }

  const fileEntry = formData.get("file");
  if (!fileEntry || typeof fileEntry === "string") {
    return fail(400, "FILE_REQUIRED", "File tidak ditemukan dalam request");
  }
  const file = fileEntry as File;

  // Validasi ekstensi & mime type.
  if (!hasAllowedExtension(file.name)) {
    return fail(
      400,
      "INVALID_FILE_TYPE",
      "Format file harus .xlsx atau .csv",
    );
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    // Browser tidak selalu mengirim mime type yang akurat — log saja, jangan
    // gagalkan jika ekstensi sudah benar.
    logger.info(`Import file dengan mime type tidak biasa: ${file.type}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    return fail(
      400,
      "FILE_TOO_LARGE",
      "Ukuran file melebihi batas 10MB",
    );
  }
  if (file.size === 0) {
    return fail(400, "FILE_EMPTY", "File kosong");
  }

  try {
    const parsed = await parseImportFile(file);

    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      return fail(
        400,
        "PARSE_FAILED",
        "Tidak dapat membaca data dari file. Pastikan file menggunakan format template.",
      );
    }

    // Kumpulkan NIP unik dari row yang punya nama_lengkap (calon insert/update).
    const nipsToCheck = new Set<string>();
    for (const raw of parsed.rows) {
      const { data } = normalizeRow(raw);
      if (data.nip && data.nama_lengkap) {
        nipsToCheck.add(data.nip);
      }
    }

    // Query existing NIPs dalam batch (single IN query).
    const existingNips = new Set<string>();
    if (nipsToCheck.size > 0) {
      const existingRows = await db
        .select({ nip: employee.nip })
        .from(employee)
        .where(inArray(employee.nip, Array.from(nipsToCheck)));
      for (const row of existingRows) {
        existingNips.add(row.nip);
      }
    }

    const result = buildImportPreview(parsed, existingNips);

    return NextResponse.json<ApiResponse<ImportPreviewResult>>({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error("Failed to preview import file", err);
    return fail(
      500,
      "INTERNAL_ERROR",
      "Gagal memproses file import. Periksa format file dan coba lagi.",
    );
  }
}
