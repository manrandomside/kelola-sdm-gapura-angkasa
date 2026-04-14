import { NextResponse } from "next/server";
import { and, count, eq, gte, lt, isNotNull, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

export const dynamic = "force-dynamic";

const MONTH_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function shortMonthLabel(month: number, year: number): string {
  const label = MONTH_LABELS[month];
  return `${label?.slice(0, 3) ?? ""} ${year}`;
}

function fullMonthLabel(month: number, year: number): string {
  return `${MONTH_LABELS[month] ?? ""} ${year}`;
}

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
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

export async function GET(): Promise<NextResponse> {
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

  // Base conditions for all queries
  const baseConditions: SQL[] = [eq(employee.status, "active")];
  if (providerScope) {
    baseConditions.push(eq(employee.provider, providerScope));
  }

  try {
    // Calculate date boundaries
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Start of current month
    const startOfCurrentMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    // Start of next month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const startOfNextMonth = `${nextMonthYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;
    // Start of last month
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const startOfLastMonth = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, "0")}-01`;

    // 12 months ago (start)
    let twelveMonthsAgoMonth = currentMonth;
    let twelveMonthsAgoYear = currentYear - 1;
    if (currentMonth === 0) {
      twelveMonthsAgoMonth = 1;
      twelveMonthsAgoYear = currentYear - 1;
    } else {
      twelveMonthsAgoMonth = currentMonth;
      twelveMonthsAgoYear = currentYear - 1;
    }
    // Actually: 11 months back from current month start
    // e.g., if current is April 2026, 12 months range is May 2025 - April 2026
    let rangeStartMonth = currentMonth + 1; // next month of last year
    let rangeStartYear = currentYear - 1;
    if (rangeStartMonth > 11) {
      rangeStartMonth = 0;
      rangeStartYear = currentYear;
    }
    const rangeStart = `${rangeStartYear}-${String(rangeStartMonth + 1).padStart(2, "0")}-01`;

    // ========================================================================
    // a. Tren Masuk vs Keluar per Bulan (12 bulan terakhir)
    // ========================================================================

    // Generate 12 months array
    const months: Array<{
      bulan: string;
      label: string;
      shortLabel: string;
      masuk: number;
      keluar: number;
    }> = [];
    for (let i = 0; i < 12; i++) {
      let m = currentMonth + 1 + i; // start from 11 months ago
      m = ((rangeStartMonth + i) % 12);
      const y = rangeStartYear + Math.floor((rangeStartMonth + i) / 12);
      months.push({
        bulan: formatYearMonth(y, m),
        label: fullMonthLabel(m, y),
        shortLabel: shortMonthLabel(m, y),
        masuk: 0,
        keluar: 0,
      });
    }

    // Query masuk
    const masukRows = await db
      .select({
        bulan: sql<string>`TO_CHAR(${employee.tmt_mulai_kerja}, 'YYYY-MM')`,
        count: count(),
      })
      .from(employee)
      .where(
        and(
          ...baseConditions,
          isNotNull(employee.tmt_mulai_kerja),
          gte(employee.tmt_mulai_kerja, rangeStart),
          lt(employee.tmt_mulai_kerja, startOfNextMonth),
        ),
      )
      .groupBy(sql`TO_CHAR(${employee.tmt_mulai_kerja}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${employee.tmt_mulai_kerja}, 'YYYY-MM')`);

    // Query keluar
    const keluarRows = await db
      .select({
        bulan: sql<string>`TO_CHAR(${employee.tmt_berakhir_kerja}, 'YYYY-MM')`,
        count: count(),
      })
      .from(employee)
      .where(
        and(
          ...baseConditions,
          isNotNull(employee.tmt_berakhir_kerja),
          gte(employee.tmt_berakhir_kerja, rangeStart),
          lt(employee.tmt_berakhir_kerja, startOfNextMonth),
        ),
      )
      .groupBy(sql`TO_CHAR(${employee.tmt_berakhir_kerja}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${employee.tmt_berakhir_kerja}, 'YYYY-MM')`);

    // Fill in data
    const masukMap = new Map(masukRows.map((r) => [r.bulan, r.count]));
    const keluarMap = new Map(keluarRows.map((r) => [r.bulan, r.count]));
    for (const m of months) {
      m.masuk = masukMap.get(m.bulan) ?? 0;
      m.keluar = keluarMap.get(m.bulan) ?? 0;
    }

    // ========================================================================
    // b. Perbandingan Bulan Ini vs Bulan Lalu
    // ========================================================================

    const [statsNow] = await db
      .select({
        total: count(),
        aktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Aktif')`,
        nonAktif: sql<number>`count(*) filter (where ${employee.status_kerja} in ('Non Aktif', 'Pensiun'))`,
        kontrakBerakhir: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja} is not null and ${employee.tmt_berakhir_kerja} >= ${startOfCurrentMonth}::date and ${employee.tmt_berakhir_kerja} < ${startOfNextMonth}::date)`,
        karyawanMasuk: sql<number>`count(*) filter (where ${employee.tmt_mulai_kerja} is not null and ${employee.tmt_mulai_kerja} >= ${startOfCurrentMonth}::date and ${employee.tmt_mulai_kerja} < ${startOfNextMonth}::date)`,
      })
      .from(employee)
      .where(and(...baseConditions));

    const [statsLast] = await db
      .select({
        total: count(),
        aktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Aktif')`,
        nonAktif: sql<number>`count(*) filter (where ${employee.status_kerja} in ('Non Aktif', 'Pensiun'))`,
        kontrakBerakhir: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja} is not null and ${employee.tmt_berakhir_kerja} >= ${startOfLastMonth}::date and ${employee.tmt_berakhir_kerja} < ${startOfCurrentMonth}::date)`,
        karyawanMasuk: sql<number>`count(*) filter (where ${employee.tmt_mulai_kerja} is not null and ${employee.tmt_mulai_kerja} >= ${startOfLastMonth}::date and ${employee.tmt_mulai_kerja} < ${startOfCurrentMonth}::date)`,
      })
      .from(employee)
      .where(and(...baseConditions));

    const bulanIni = {
      label: fullMonthLabel(currentMonth, currentYear),
      total: statsNow?.total ?? 0,
      aktif: Number(statsNow?.aktif ?? 0),
      nonAktif: Number(statsNow?.nonAktif ?? 0),
      kontrakBerakhir: Number(statsNow?.kontrakBerakhir ?? 0),
      karyawanMasuk: Number(statsNow?.karyawanMasuk ?? 0),
    };

    const bulanLalu = {
      label: fullMonthLabel(lastMonth, lastMonthYear),
      total: statsLast?.total ?? 0,
      aktif: Number(statsLast?.aktif ?? 0),
      nonAktif: Number(statsLast?.nonAktif ?? 0),
      kontrakBerakhir: Number(statsLast?.kontrakBerakhir ?? 0),
      karyawanMasuk: Number(statsLast?.karyawanMasuk ?? 0),
    };

    const perbandingan = {
      bulanIni,
      bulanLalu,
      selisih: {
        total: bulanIni.total - bulanLalu.total,
        aktif: bulanIni.aktif - bulanLalu.aktif,
        nonAktif: bulanIni.nonAktif - bulanLalu.nonAktif,
        kontrakBerakhir: bulanIni.kontrakBerakhir - bulanLalu.kontrakBerakhir,
        karyawanMasuk: bulanIni.karyawanMasuk - bulanLalu.karyawanMasuk,
      },
    };

    // ========================================================================
    // c. Turn-over Rate per Provider
    // ========================================================================

    const turnoverConditions: SQL[] = [
      eq(employee.status, "active"),
      isNotNull(employee.provider),
    ];
    if (providerScope) {
      turnoverConditions.push(eq(employee.provider, providerScope));
    }

    const turnoverRows = await db
      .select({
        provider: employee.provider,
        total: count(),
        masuk: sql<number>`count(*) filter (where ${employee.tmt_mulai_kerja} >= ${startOfLastMonth}::date and ${employee.tmt_mulai_kerja} < ${startOfCurrentMonth}::date)`,
        keluar: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja} >= ${startOfLastMonth}::date and ${employee.tmt_berakhir_kerja} < ${startOfCurrentMonth}::date)`,
      })
      .from(employee)
      .where(and(...turnoverConditions))
      .groupBy(employee.provider)
      .orderBy(sql`count(*) desc`);

    const turnover = turnoverRows.map((row) => {
      const total = row.total;
      const keluar = Number(row.keluar);
      const masuk = Number(row.masuk);
      const turnoverRate = total > 0 ? Math.round((keluar / total) * 1000) / 10 : 0;
      return {
        provider: row.provider ?? "",
        total,
        masuk,
        keluar,
        turnoverRate,
      };
    });

    // Sort by turnover rate descending
    turnover.sort((a, b) => b.turnoverRate - a.turnoverRate);

    return NextResponse.json({
      success: true,
      data: {
        trenBulanan: months,
        perbandingan,
        turnover,
      },
    });
  } catch (err) {
    logger.error("Failed to fetch analytics", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat data analitik");
  }
}
