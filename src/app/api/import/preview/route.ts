import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import {
  buildImportPreview,
  detectColumnMapping,
  normalizeRow,
  parseImportFile,
} from "@/lib/utils/excel";

import type { ApiResponse } from "@/types/api";
import type { EnhancedImportPreviewResult } from "@/lib/utils/excel";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".xlsx", ".csv"];
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/x-csv",
  "application/octet-stream",
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
): Promise<NextResponse<ApiResponse<EnhancedImportPreviewResult>>> {
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

  if (!hasAllowedExtension(file.name)) {
    return fail(
      400,
      "INVALID_FILE_TYPE",
      "Format file harus .xlsx atau .csv",
    );
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
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

    // Collect unique NIPs to check
    const nipsToCheck = new Set<string>();
    for (const raw of parsed.rows) {
      const { data } = normalizeRow(raw);
      if (data.nip && data.nama_lengkap) {
        nipsToCheck.add(data.nip);
      }
    }

    // Query existing NIPs with names for duplicate detection
    const existingNipMap = new Map<string, string>();
    if (nipsToCheck.size > 0) {
      const existingRows = await db
        .select({ nip: employee.nip, nama_lengkap: employee.nama_lengkap })
        .from(employee)
        .where(inArray(employee.nip, Array.from(nipsToCheck)));
      for (const row of existingRows) {
        existingNipMap.set(row.nip, row.nama_lengkap);
      }
    }

    const existingNips = new Set(existingNipMap.keys());
    const result = buildImportPreview(parsed, existingNips);

    // Build duplicate detection info
    const duplicateNips: EnhancedImportPreviewResult["duplicateNips"] = [];
    const newNips: EnhancedImportPreviewResult["newNips"] = [];

    for (const row of result.rows) {
      if (!row.data.nip || !row.data.nama_lengkap) continue;
      if (!row.validation.isValid) continue;

      if (existingNipMap.has(row.data.nip)) {
        duplicateNips.push({
          nip: row.data.nip,
          namaLengkap: row.data.nama_lengkap,
          existingName: existingNipMap.get(row.data.nip)!,
          action: "update" as const,
        });
      } else {
        newNips.push({
          nip: row.data.nip,
          namaLengkap: row.data.nama_lengkap,
          action: "insert" as const,
        });
      }
    }

    // Build per-row enhanced data with cell errors and action
    const enhancedRows: EnhancedImportPreviewResult["enhancedRows"] = result.rows.map((row) => {
      const cellErrors: { field: string; value: string | null; message: string }[] = [];

      // Convert validation errors to cell errors
      for (const err of row.validation.errors) {
        const value = row.data[err.field as keyof typeof row.data];
        cellErrors.push({
          field: err.field,
          value: value != null ? String(value) : null,
          message: err.message,
        });
      }
      for (const warn of row.validation.warnings) {
        const value = row.data[warn.field as keyof typeof row.data];
        cellErrors.push({
          field: warn.field,
          value: value != null ? String(value) : null,
          message: warn.message,
        });
      }

      let action: "insert" | "update" | "skip" = "skip";
      if (row.validation.isValid) {
        action = row.isExistingNip ? "update" : "insert";
      }

      return {
        rowIndex: row.rowNumber,
        data: row.data,
        isValid: row.validation.isValid,
        cellErrors,
        action,
      };
    });

    // Detect column mapping
    const detectedColumns = detectColumnMapping(parsed.headers);

    const enhancedResult: EnhancedImportPreviewResult = {
      ...result,
      duplicateNips,
      newNips,
      duplicateCount: duplicateNips.length,
      newCount: newNips.length,
      enhancedRows,
      detectedColumns,
    };

    return NextResponse.json<ApiResponse<EnhancedImportPreviewResult>>({
      success: true,
      data: enhancedResult,
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
