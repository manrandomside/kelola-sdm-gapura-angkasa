import { NextResponse } from "next/server";
import { and, asc, eq, gte, lte, isNotNull, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";

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
  const days = parseInt(url.searchParams.get("days") ?? "90", 10);

  if (![30, 60, 90].includes(days)) {
    return fail(400, "BAD_REQUEST", "Parameter days harus 30, 60, atau 90");
  }

  const today = new Date().toISOString().split("T")[0];
  const futureDate = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

  const base: SQL[] = [
    eq(employee.status, "active"),
    isNotNull(employee.tmt_berakhir_kerja),
    gte(employee.tmt_berakhir_kerja, today),
    lte(employee.tmt_berakhir_kerja, futureDate),
  ];
  if (providerScope) base.push(eq(employee.provider, providerScope));

  try {
    // Get all employees with contracts expiring within range
    const rows = await db
      .select({
        nip: employee.nip,
        namaLengkap: employee.nama_lengkap,
        namaJabatan: employee.nama_jabatan,
        unitOrganisasi: employee.unit_organisasi,
        provider: employee.provider,
        tmtBerakhirKerja: employee.tmt_berakhir_kerja,
      })
      .from(employee)
      .where(and(...base))
      .orderBy(asc(employee.tmt_berakhir_kerja));

    // Group by provider
    const providerMap = new Map<string, typeof rows>();
    for (const row of rows) {
      const p = row.provider ?? "Tidak Diketahui";
      const list = providerMap.get(p) ?? [];
      list.push(row);
      providerMap.set(p, list);
    }

    const perProvider = Array.from(providerMap.entries())
      .map(([provider, list]) => ({
        provider,
        count: list.length,
        karyawan: list.map((r) => {
          const endDate = r.tmtBerakhirKerja ? new Date(r.tmtBerakhirKerja) : new Date();
          const todayDate = new Date();
          const sisaHari = Math.ceil((endDate.getTime() - todayDate.getTime()) / 86400000);
          return {
            nip: r.nip,
            namaLengkap: r.namaLengkap,
            namaJabatan: r.namaJabatan ?? "-",
            unitOrganisasi: r.unitOrganisasi ?? "-",
            tmtBerakhirKerja: r.tmtBerakhirKerja ?? "-",
            sisaHari: Math.max(0, sisaHari),
          };
        }),
      }))
      .sort((a, b) => b.count - a.count);

    // Per unit summary
    const unitMap = new Map<string, number>();
    for (const row of rows) {
      const u = row.unitOrganisasi ?? "Lainnya";
      unitMap.set(u, (unitMap.get(u) ?? 0) + 1);
    }
    const perUnit = Array.from(unitMap.entries())
      .map(([unit, cnt]) => ({ unit, count: cnt }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        rentangHari: days,
        total: rows.length,
        perProvider,
        perUnit,
      },
    });
  } catch (err) {
    logger.error("Failed to fetch contract report", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat data laporan kontrak");
  }
}
