import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

import { db } from "@/lib/db";
import { activityLog, employee, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";
import { formatDateWITA } from "@/lib/utils/date";

import type { ApiResponse } from "@/types/api";

export const dynamic = "force-dynamic";

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

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const appUser = await getSessionUser(authUser.id);
  if (!appUser) {
    return fail(403, "FORBIDDEN", "Akun tidak terdaftar");
  }

  const providerScope = getProviderFilter(appUser);
  const providerCondition = providerScope
    ? sql`AND provider = ${providerScope}`
    : sql``;

  try {
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
        ${providerCondition}
      GROUP BY nama_jabatan
      ORDER BY total DESC, nama_jabatan ASC
    `);

    // Summary row
    const summaryRows = await db.execute<{
      pegawai_tetap: string;
      pkwt: string;
      tad: string;
      grand_total: string;
    }>(sql`
      SELECT
        COUNT(*) FILTER (WHERE status_pegawai = 'PEGAWAI TETAP') as pegawai_tetap,
        COUNT(*) FILTER (WHERE status_pegawai = 'PKWT') as pkwt,
        COUNT(*) FILTER (WHERE status_pegawai = 'TAD') as tad,
        COUNT(*) as grand_total
      FROM employee
      WHERE status = 'active'
        AND nama_jabatan IS NOT NULL
        AND nama_jabatan != ''
        AND nama_jabatan != '-'
        ${providerCondition}
    `);

    const summary = summaryRows[0];

    // Build worksheet data
    const headers = ["No", "Nama Jabatan", "Pegawai Tetap", "PKWT", "TAD", "Total"];
    const wsData: (string | number)[][] = [headers];

    rows.forEach((r, idx) => {
      wsData.push([
        idx + 1,
        r.nama_jabatan,
        Number(r.pegawai_tetap),
        Number(r.pkwt),
        Number(r.tad),
        Number(r.total),
      ]);
    });

    // Grand total row
    wsData.push([
      "",
      "GRAND TOTAL",
      Number(summary?.pegawai_tetap ?? 0),
      Number(summary?.pkwt ?? 0),
      Number(summary?.tad ?? 0),
      Number(summary?.grand_total ?? 0),
    ] as (string | number)[]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
      { wch: 5 },   // No
      { wch: 45 },  // Nama Jabatan
      { wch: 15 },  // Pegawai Tetap
      { wch: 10 },  // PKWT
      { wch: 10 },  // TAD
      { wch: 10 },  // Total
    ];

    // Style header row (green background, white bold text)
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "439454" } },
      alignment: { horizontal: "center" as const },
    };

    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[cellRef]) {
        ws[cellRef].s = headerStyle;
      }
    }

    // Style grand total row (bold, light gray background)
    const totalRowIdx = wsData.length - 1;
    const totalRowStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "F3F4F6" } },
    };

    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: totalRowIdx, c });
      if (ws[cellRef]) {
        ws[cellRef].s = totalRowStyle;
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap SDM");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const dateStamp = formatDateWITA(new Date(), "yyyy-MM-dd");
    const fileName = `Rekap_SDM_GapuraAngkasa_${dateStamp}.xlsx`;

    // Activity log
    try {
      await db.insert(activityLog).values({
        user_id: appUser.id,
        user_email: appUser.email,
        user_name: appUser.fullName,
        activity: "export_excel",
        description: `${appUser.fullName} mengexport rekap SDM (${rows.length} jabatan)`,
        target_type: "rekap_sdm",
        target_label: fileName,
        metadata: { total_jabatan: rows.length },
        ip_address: request.headers.get("x-forwarded-for") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (err) {
      logger.error("Failed to log rekap export activity", err);
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("Failed to export rekap SDM", err);
    return fail(500, "INTERNAL_ERROR", "Gagal mengexport rekap SDM");
  }
}
