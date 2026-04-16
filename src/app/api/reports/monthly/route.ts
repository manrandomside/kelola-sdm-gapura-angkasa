import { NextResponse } from "next/server";
import { and, count, eq, isNotNull, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

export const dynamic = "force-dynamic";

const MONTH_LABELS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

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
  if (!authUser) return fail(401, "UNAUTHORIZED", "Sesi tidak valid");

  const appUser = await getSessionUser(authUser.id);
  if (!appUser) return fail(403, "FORBIDDEN", "Akun tidak terdaftar");

  const providerScope = getProviderFilter(appUser);

  const url = new URL(request.url);
  const month = parseInt(url.searchParams.get("month") ?? "", 10);
  const year = parseInt(url.searchParams.get("year") ?? "", 10);

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return fail(400, "BAD_REQUEST", "Parameter month/year tidak valid");
  }

  const monthIdx = month - 1;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const base: SQL[] = [eq(employee.status, "active")];
  if (providerScope) base.push(eq(employee.provider, providerScope));

  try {
    // Ringkasan
    const [summary] = await db
      .select({
        total: count(),
        aktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Aktif')`,
        nonAktif: sql<number>`count(*) filter (where ${employee.status_kerja} in ('Non Aktif', 'Pensiun'))`,
        pegawaiTetap: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PEGAWAI TETAP')`,
        pkwt: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PKWT')`,
        tad: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'TAD')`,
        masukBulanIni: sql<number>`count(*) filter (where ${employee.tmt_mulai_kerja} >= ${startDate}::date and ${employee.tmt_mulai_kerja} < ${endDate}::date)`,
        keluarBulanIni: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja} >= ${startDate}::date and ${employee.tmt_berakhir_kerja} < ${endDate}::date)`,
      })
      .from(employee)
      .where(and(...base));

    // Per unit
    const perUnit = await db
      .select({
        unit: employee.unit_organisasi,
        total: count(),
        pegawaiTetap: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PEGAWAI TETAP')`,
        pkwt: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PKWT')`,
        tad: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'TAD')`,
      })
      .from(employee)
      .where(and(...base, isNotNull(employee.unit_organisasi)))
      .groupBy(employee.unit_organisasi)
      .orderBy(sql`count(*) desc`);

    // Per provider
    const perProvider = await db
      .select({
        provider: employee.provider,
        total: count(),
        aktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Aktif')`,
        nonAktif: sql<number>`count(*) filter (where ${employee.status_kerja} in ('Non Aktif', 'Pensiun'))`,
      })
      .from(employee)
      .where(and(...base, isNotNull(employee.provider)))
      .groupBy(employee.provider)
      .orderBy(sql`count(*) desc`);

    // Per status kontrak
    const perStatusKontrak = await db
      .select({
        status: employee.status_kontrak,
        count: count(),
      })
      .from(employee)
      .where(and(...base, isNotNull(employee.status_kontrak)))
      .groupBy(employee.status_kontrak)
      .orderBy(sql`count(*) desc`);

    // Kontrak akan berakhir
    const today = new Date().toISOString().split("T")[0];
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const in60 = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

    const [kontrak] = await db
      .select({
        dalam30hari: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja} >= ${today}::date and ${employee.tmt_berakhir_kerja} <= ${in30}::date)`,
        dalam60hari: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja} >= ${today}::date and ${employee.tmt_berakhir_kerja} <= ${in60}::date)`,
        dalam90hari: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja} >= ${today}::date and ${employee.tmt_berakhir_kerja} <= ${in90}::date)`,
      })
      .from(employee)
      .where(and(...base, isNotNull(employee.tmt_berakhir_kerja)));

    return NextResponse.json({
      success: true,
      data: {
        periode: { month, year, label: `${MONTH_LABELS[monthIdx]} ${year}` },
        ringkasan: {
          total: summary?.total ?? 0,
          aktif: Number(summary?.aktif ?? 0),
          nonAktif: Number(summary?.nonAktif ?? 0),
          pegawaiTetap: Number(summary?.pegawaiTetap ?? 0),
          pkwt: Number(summary?.pkwt ?? 0),
          tad: Number(summary?.tad ?? 0),
          masukBulanIni: Number(summary?.masukBulanIni ?? 0),
          keluarBulanIni: Number(summary?.keluarBulanIni ?? 0),
        },
        perUnit: perUnit.map((r) => ({
          unit: r.unit ?? "-",
          total: r.total,
          pegawaiTetap: Number(r.pegawaiTetap),
          pkwt: Number(r.pkwt),
          tad: Number(r.tad),
        })),
        perProvider: perProvider.map((r) => ({
          provider: r.provider ?? "-",
          total: r.total,
          aktif: Number(r.aktif),
          nonAktif: Number(r.nonAktif),
        })),
        perStatusKontrak: perStatusKontrak.map((r) => ({
          status: r.status ?? "-",
          count: r.count,
        })),
        kontrakAkanBerakhir: {
          dalam30hari: Number(kontrak?.dalam30hari ?? 0),
          dalam60hari: Number(kontrak?.dalam60hari ?? 0),
          dalam90hari: Number(kontrak?.dalam90hari ?? 0),
        },
      },
    });
  } catch (err) {
    logger.error("Failed to fetch monthly report", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat data laporan bulanan");
  }
}
