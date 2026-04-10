import { NextResponse } from "next/server";
import { and, count, desc, eq, isNotNull, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface ChartDataPoint {
  name: string;
  value: number;
}

interface GenderDataPoint {
  label: string;
  value: string;
  count: number;
  percentage: number;
}

interface AgeRangePoint {
  range: string;
  count: number;
}

interface PositionGroupPoint {
  label: string;
  count: number;
}

interface StatusPerOrgPoint {
  kode: string;
  pegawaiTetap: number;
  pkwt: number;
  tad: number;
}

interface DashboardCharts {
  statusKontrak: ChartDataPoint[];
  statusPegawai: ChartDataPoint[];
  unitOrganisasi: ChartDataPoint[];
  provider: ChartDataPoint[];
  jenisKelamin: GenderDataPoint[];
  komposisiUsia: AgeRangePoint[];
  kelompokJabatan: PositionGroupPoint[];
  statusPerOrganisasi: StatusPerOrgPoint[];
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

const GENDER_LABEL: Record<string, string> = {
  L: "Laki-laki",
  P: "Perempuan",
};

const AGE_RANGE_ORDER = ["18-25", "26-35", "36-45", "46-55", "56+", "N/A"];

export async function GET(): Promise<NextResponse<ApiResponse<DashboardCharts>>> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  try {
    const activeFilter = eq(employee.status, "active");

    const [
      statusKontrakRows,
      statusPegawaiRows,
      unitOrgRows,
      providerRows,
      genderRows,
      ageRows,
      positionGroupRows,
      statusOrgRows,
    ] = await Promise.all([
      // 1. Status kontrak
      db
        .select({
          name: employee.status_kontrak,
          value: count(),
        })
        .from(employee)
        .where(and(activeFilter, isNotNull(employee.status_kontrak)))
        .groupBy(employee.status_kontrak)
        .orderBy(desc(sql`count(*)`)),

      // 2. Status pegawai
      db
        .select({
          name: employee.status_pegawai,
          value: count(),
        })
        .from(employee)
        .where(and(activeFilter, isNotNull(employee.status_pegawai)))
        .groupBy(employee.status_pegawai)
        .orderBy(desc(sql`count(*)`)),

      // 3. Unit organisasi
      db
        .select({
          name: employee.unit_organisasi,
          value: count(),
        })
        .from(employee)
        .where(and(activeFilter, isNotNull(employee.unit_organisasi)))
        .groupBy(employee.unit_organisasi)
        .orderBy(desc(sql`count(*)`)),

      // 4. Provider
      db
        .select({
          name: employee.provider,
          value: count(),
        })
        .from(employee)
        .where(and(activeFilter, isNotNull(employee.provider)))
        .groupBy(employee.provider)
        .orderBy(desc(sql`count(*)`)),

      // 5. Jenis kelamin
      db
        .select({
          name: employee.jenis_kelamin,
          value: count(),
        })
        .from(employee)
        .where(and(activeFilter, isNotNull(employee.jenis_kelamin)))
        .groupBy(employee.jenis_kelamin)
        .orderBy(desc(sql`count(*)`)),

      // 6. Komposisi usia — use COALESCE: prefer usia column, fallback to age from tanggal_lahir
      db
        .select({
          range: sql<string>`
            CASE
              WHEN COALESCE(${employee.usia}, EXTRACT(YEAR FROM age(CURRENT_DATE, ${employee.tanggal_lahir}::date))::int) BETWEEN 18 AND 25 THEN '18-25'
              WHEN COALESCE(${employee.usia}, EXTRACT(YEAR FROM age(CURRENT_DATE, ${employee.tanggal_lahir}::date))::int) BETWEEN 26 AND 35 THEN '26-35'
              WHEN COALESCE(${employee.usia}, EXTRACT(YEAR FROM age(CURRENT_DATE, ${employee.tanggal_lahir}::date))::int) BETWEEN 36 AND 45 THEN '36-45'
              WHEN COALESCE(${employee.usia}, EXTRACT(YEAR FROM age(CURRENT_DATE, ${employee.tanggal_lahir}::date))::int) BETWEEN 46 AND 55 THEN '46-55'
              WHEN COALESCE(${employee.usia}, EXTRACT(YEAR FROM age(CURRENT_DATE, ${employee.tanggal_lahir}::date))::int) > 55 THEN '56+'
              ELSE 'N/A'
            END
          `.as("range"),
          value: count(),
        })
        .from(employee)
        .where(activeFilter)
        .groupBy(sql`range`),

      // 7. Kelompok jabatan
      db
        .select({
          name: employee.kelompok_jabatan,
          value: count(),
        })
        .from(employee)
        .where(
          and(
            activeFilter,
            isNotNull(employee.kelompok_jabatan),
            ne(employee.kelompok_jabatan, ""),
          ),
        )
        .groupBy(employee.kelompok_jabatan)
        .orderBy(desc(sql`count(*)`)),

      // 8. Status pegawai per kode organisasi (for stacked bar)
      db
        .select({
          kode: employee.kode_organisasi,
          statusPegawai: employee.status_pegawai,
          value: count(),
        })
        .from(employee)
        .where(
          and(
            activeFilter,
            isNotNull(employee.kode_organisasi),
            ne(employee.kode_organisasi, ""),
          ),
        )
        .groupBy(employee.kode_organisasi, employee.status_pegawai)
        .orderBy(employee.kode_organisasi),
    ]);

    const toPoints = (rows: { name: string | null; value: number }[]): ChartDataPoint[] =>
      rows
        .filter((r): r is { name: string; value: number } => r.name !== null)
        .map((r) => ({ name: r.name, value: Number(r.value) }));

    // Gender data with percentage
    const genderTotal = genderRows.reduce((acc, r) => acc + Number(r.value), 0);
    const jenisKelamin: GenderDataPoint[] = genderRows
      .filter((r): r is { name: string; value: number } => r.name !== null)
      .map((r) => ({
        label: GENDER_LABEL[r.name] ?? r.name,
        value: r.name,
        count: Number(r.value),
        percentage: genderTotal > 0 ? (Number(r.value) / genderTotal) * 100 : 0,
      }));

    // Age range sorted by defined order
    const komposisiUsia: AgeRangePoint[] = AGE_RANGE_ORDER
      .map((range) => {
        const row = ageRows.find((r) => r.range === range);
        return { range, count: row ? Number(row.value) : 0 };
      })
      .filter((r) => r.count > 0);

    // Position group
    const kelompokJabatan: PositionGroupPoint[] = positionGroupRows
      .filter((r): r is { name: string; value: number } => r.name !== null)
      .map((r) => ({ label: r.name, count: Number(r.value) }));

    // Pivot status per org
    const orgMap = new Map<string, StatusPerOrgPoint>();
    for (const row of statusOrgRows) {
      const kode = row.kode ?? "Lainnya";
      if (!orgMap.has(kode)) {
        orgMap.set(kode, { kode, pegawaiTetap: 0, pkwt: 0, tad: 0 });
      }
      const entry = orgMap.get(kode)!;
      const val = Number(row.value);
      if (row.statusPegawai === "PEGAWAI TETAP") entry.pegawaiTetap = val;
      else if (row.statusPegawai === "PKWT") entry.pkwt = val;
      else if (row.statusPegawai === "TAD") entry.tad = val;
    }
    const statusPerOrganisasi = Array.from(orgMap.values()).sort((a, b) =>
      a.kode.localeCompare(b.kode),
    );

    const data: DashboardCharts = {
      statusKontrak: toPoints(statusKontrakRows),
      statusPegawai: toPoints(statusPegawaiRows),
      unitOrganisasi: toPoints(unitOrgRows),
      provider: toPoints(providerRows),
      jenisKelamin,
      komposisiUsia,
      kelompokJabatan,
      statusPerOrganisasi,
    };

    return NextResponse.json<ApiResponse<DashboardCharts>>({
      success: true,
      data,
    });
  } catch (err) {
    logger.error("Failed to fetch dashboard charts", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat data chart dashboard");
  }
}
