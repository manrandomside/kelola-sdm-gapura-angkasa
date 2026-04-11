import { NextResponse } from "next/server";
import { and, eq, ne, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

export const dynamic = "force-dynamic";

interface RekapRow {
  namaJabatan: string;
  pegawaiTetap: number;
  pkwt: number;
  tad: number;
  total: number;
}

interface RekapSummary {
  totalJabatan: number;
  pegawaiTetap: number;
  pkwt: number;
  tad: number;
  grandTotal: number;
}

interface RekapData {
  rows: RekapRow[];
  summary: RekapSummary;
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

export async function GET(request: Request): Promise<NextResponse> {
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

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const sortParam = searchParams.get("sort") ?? "namaJabatan";
  const orderParam = searchParams.get("order") ?? "asc";
  const limitParam = searchParams.get("limit");

  // Validate sort column
  const validSortColumns = ["namaJabatan", "pegawaiTetap", "pkwt", "tad", "total"];
  const sortColumn = validSortColumns.includes(sortParam) ? sortParam : "namaJabatan";
  const sortOrder = orderParam === "asc" ? "ASC" : "DESC";

  // Map sort column to SQL expression
  const sortColumnMap: Record<string, string> = {
    namaJabatan: "nama_jabatan",
    pegawaiTetap: "pegawai_tetap",
    pkwt: "pkwt",
    tad: "tad",
    total: "total",
  };

  try {
    // Build search condition
    const searchCondition = search.length > 0
      ? sql`AND nama_jabatan ILIKE ${"%" + search + "%"}`
      : sql``;

    const rows = await db.execute<{
      nama_jabatan: string;
      pegawai_tetap: string;
      pkwt: string;
      tad: string;
      total: string;
    }>(sql`
      SELECT
        nama_jabatan,
        COUNT(*) FILTER (WHERE status_pegawai = 'PEGAWAI TETAP') as pegawai_tetap,
        COUNT(*) FILTER (WHERE status_pegawai = 'PKWT') as pkwt,
        COUNT(*) FILTER (WHERE status_pegawai = 'TAD') as tad,
        COUNT(*) as total
      FROM employee
      WHERE status = 'active'
        AND nama_jabatan IS NOT NULL
        AND nama_jabatan != ''
        AND nama_jabatan != '-'
        ${searchCondition}
      GROUP BY nama_jabatan
      ORDER BY ${sql.raw(sortColumnMap[sortColumn])} ${sql.raw(sortOrder)}${sortColumn !== "namaJabatan" ? sql`, nama_jabatan ASC` : sql``}
      ${limitParam ? sql`LIMIT ${Number(limitParam)}` : sql``}
    `);

    // Compute summary from ALL data (no limit, no search filter for grand total)
    const summaryRows = await db.execute<{
      total_jabatan: string;
      pegawai_tetap: string;
      pkwt: string;
      tad: string;
      grand_total: string;
    }>(sql`
      SELECT
        COUNT(DISTINCT nama_jabatan) as total_jabatan,
        COUNT(*) FILTER (WHERE status_pegawai = 'PEGAWAI TETAP') as pegawai_tetap,
        COUNT(*) FILTER (WHERE status_pegawai = 'PKWT') as pkwt,
        COUNT(*) FILTER (WHERE status_pegawai = 'TAD') as tad,
        COUNT(*) as grand_total
      FROM employee
      WHERE status = 'active'
        AND nama_jabatan IS NOT NULL
        AND nama_jabatan != ''
        AND nama_jabatan != '-'
    `);

    const summaryRow = summaryRows[0];

    const rekapRows: RekapRow[] = rows.map((r) => ({
      namaJabatan: r.nama_jabatan,
      pegawaiTetap: Number(r.pegawai_tetap),
      pkwt: Number(r.pkwt),
      tad: Number(r.tad),
      total: Number(r.total),
    }));

    const summary: RekapSummary = {
      totalJabatan: Number(summaryRow?.total_jabatan ?? 0),
      pegawaiTetap: Number(summaryRow?.pegawai_tetap ?? 0),
      pkwt: Number(summaryRow?.pkwt ?? 0),
      tad: Number(summaryRow?.tad ?? 0),
      grandTotal: Number(summaryRow?.grand_total ?? 0),
    };

    return NextResponse.json<ApiResponse<RekapData>>({
      success: true,
      data: { rows: rekapRows, summary },
    });
  } catch (err) {
    logger.error("Failed to fetch rekap SDM", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat data rekap SDM");
  }
}
