import { NextResponse } from "next/server";
import { count, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface DashboardStatistics {
  total: number;
  pegawaiTetap: number;
  pkwt: number;
  tad: number;
  tadPaketPekerjaan: number;
  tadPaketSdm: number;
  aktif: number;
  nonAktif: number;
  pensiun: number;
  mutasi: number;
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

export async function GET(): Promise<NextResponse<ApiResponse<DashboardStatistics>>> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  try {
    // Satu query dengan conditional COUNT agar efisien.
    const rows = await db
      .select({
        total: count(),
        pegawaiTetap: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PEGAWAI TETAP')`,
        pkwt: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PKWT')`,
        tad: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'TAD')`,
        tadPaketPekerjaan: sql<number>`count(*) filter (where ${employee.status_kontrak} = 'PAKET PEKERJAAN')`,
        tadPaketSdm: sql<number>`count(*) filter (where ${employee.status_kontrak} = 'PAKET SDM')`,
        aktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Aktif')`,
        nonAktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Non Aktif')`,
        pensiun: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Pensiun')`,
        mutasi: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Mutasi')`,
      })
      .from(employee)
      .where(eq(employee.status, "active"));

    const row = rows[0];
    const statistics: DashboardStatistics = {
      total: Number(row?.total ?? 0),
      pegawaiTetap: Number(row?.pegawaiTetap ?? 0),
      pkwt: Number(row?.pkwt ?? 0),
      tad: Number(row?.tad ?? 0),
      tadPaketPekerjaan: Number(row?.tadPaketPekerjaan ?? 0),
      tadPaketSdm: Number(row?.tadPaketSdm ?? 0),
      aktif: Number(row?.aktif ?? 0),
      nonAktif: Number(row?.nonAktif ?? 0),
      pensiun: Number(row?.pensiun ?? 0),
      mutasi: Number(row?.mutasi ?? 0),
    };

    return NextResponse.json<ApiResponse<DashboardStatistics>>({
      success: true,
      data: statistics,
    });
  } catch (err) {
    logger.error("Failed to fetch dashboard statistics", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat statistik dashboard");
  }
}
