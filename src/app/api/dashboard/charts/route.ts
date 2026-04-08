import { NextResponse } from "next/server";
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface ChartDataPoint {
  name: string;
  value: number;
}

interface DashboardCharts {
  statusKontrak: ChartDataPoint[];
  unitOrganisasi: ChartDataPoint[];
  provider: ChartDataPoint[];
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

    const [statusKontrakRows, unitOrgRows, providerRows] = await Promise.all([
      db
        .select({
          name: employee.status_kontrak,
          value: count(),
        })
        .from(employee)
        .where(and(activeFilter, isNotNull(employee.status_kontrak)))
        .groupBy(employee.status_kontrak)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          name: employee.unit_organisasi,
          value: count(),
        })
        .from(employee)
        .where(and(activeFilter, isNotNull(employee.unit_organisasi)))
        .groupBy(employee.unit_organisasi)
        .orderBy(desc(sql`count(*)`)),

      db
        .select({
          name: employee.provider,
          value: count(),
        })
        .from(employee)
        .where(and(activeFilter, isNotNull(employee.provider)))
        .groupBy(employee.provider)
        .orderBy(desc(sql`count(*)`)),
    ]);

    const toPoints = (rows: { name: string | null; value: number }[]): ChartDataPoint[] =>
      rows
        .filter((r): r is { name: string; value: number } => r.name !== null)
        .map((r) => ({ name: r.name, value: Number(r.value) }));

    const data: DashboardCharts = {
      statusKontrak: toPoints(statusKontrakRows),
      unitOrganisasi: toPoints(unitOrgRows),
      provider: toPoints(providerRows),
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
