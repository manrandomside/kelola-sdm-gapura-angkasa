import { NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { importLog, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface ImportLogItem {
  id: string;
  user_id: string | null;
  user_name: string | null;
  file_name: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  skipped_count: number;
  error_details: unknown;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

interface ImportLogListResponse {
  logs: ImportLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max?: number,
): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  if (max && n > max) return max;
  return n;
}

export async function GET(
  request: Request,
): Promise<NextResponse<ApiResponse<ImportLogListResponse>>> {
  // Auth: admin / super_admin only.
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
    return fail(403, "FORBIDDEN", "Anda tidak memiliki akses");
  }

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);

  try {
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: importLog.id,
          user_id: importLog.user_id,
          user_name: user.full_name,
          file_name: importLog.file_name,
          total_rows: importLog.total_rows,
          success_count: importLog.success_count,
          error_count: importLog.error_count,
          skipped_count: importLog.skipped_count,
          error_details: importLog.error_details,
          status: importLog.status,
          started_at: importLog.started_at,
          completed_at: importLog.completed_at,
          created_at: importLog.created_at,
        })
        .from(importLog)
        .leftJoin(user, eq(user.id, importLog.user_id))
        .orderBy(desc(importLog.created_at))
        .limit(limit)
        .offset((page - 1) * limit),

      db.select({ value: count() }).from(importLog),
    ]);

    const total = Number(totalRows[0]?.value ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const logs: ImportLogItem[] = rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.user_name,
      file_name: r.file_name,
      total_rows: r.total_rows,
      success_count: r.success_count,
      error_count: r.error_count,
      skipped_count: r.skipped_count,
      error_details: r.error_details,
      status: r.status,
      started_at:
        r.started_at instanceof Date
          ? r.started_at.toISOString()
          : String(r.started_at),
      completed_at:
        r.completed_at instanceof Date
          ? r.completed_at.toISOString()
          : r.completed_at
            ? String(r.completed_at)
            : null,
      created_at:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }));

    return NextResponse.json<ApiResponse<ImportLogListResponse>>({
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, totalPages },
      },
    });
  } catch (err) {
    logger.error("Failed to fetch import logs", err);
    return fail(500, "INTERNAL_ERROR", "Gagal mengambil riwayat import");
  }
}
