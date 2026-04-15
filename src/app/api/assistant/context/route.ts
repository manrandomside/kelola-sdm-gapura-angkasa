import { NextResponse } from "next/server";
import { and, count, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface UnitCount {
  unit: string;
  total: number;
}

interface ProviderCount {
  provider: string;
  total: number;
}

interface JabatanCount {
  jabatan: string;
  total: number;
}

export interface AssistantContext {
  total: number;
  pegawaiTetap: number;
  pkwt: number;
  tad: number;
  aktif: number;
  nonAktif: number;
  tadPaketSdm: number;
  tadPaketPekerjaan: number;
  kontrakBerakhir30: number;
  kontrakBerakhir90: number;
  perUnit: UnitCount[];
  perProvider: ProviderCount[];
  perJabatan: JabatanCount[];
  perJenisKelamin: { L: number; P: number };
  providerUser: string | null;
  namaUser: string;
  roleUser: string;
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

export async function GET(): Promise<NextResponse<ApiResponse<AssistantContext>>> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const sessionUser = await getSessionUser(authUser.id);
  if (!sessionUser) {
    return fail(403, "FORBIDDEN", "Akun tidak terdaftar");
  }

  const providerScope = getProviderFilter(sessionUser);

  try {
    const conditions: SQL[] = [eq(employee.status, "active")];
    if (providerScope) {
      conditions.push(eq(employee.provider, providerScope));
    }
    const whereClause = and(...conditions);

    // Run all queries in parallel
    const [statsRows, unitRows, providerRows, jabatanRows, genderRows] =
      await Promise.all([
        // Aggregate statistics
        db
          .select({
            total: count(),
            pegawaiTetap: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PEGAWAI TETAP')`,
            pkwt: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PKWT')`,
            tad: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'TAD')`,
            tadPaketSdm: sql<number>`count(*) filter (where ${employee.status_kontrak} = 'PAKET SDM')`,
            tadPaketPekerjaan: sql<number>`count(*) filter (where ${employee.status_kontrak} = 'PAKET PEKERJAAN')`,
            aktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Aktif')`,
            nonAktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Non Aktif')`,
            kontrakBerakhir30: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja}::date > CURRENT_DATE and ${employee.tmt_berakhir_kerja}::date <= CURRENT_DATE + interval '30 days' and ${employee.status_kerja} = 'Aktif')`,
            kontrakBerakhir90: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja}::date > CURRENT_DATE and ${employee.tmt_berakhir_kerja}::date <= CURRENT_DATE + interval '90 days' and ${employee.status_kerja} = 'Aktif')`,
          })
          .from(employee)
          .where(whereClause),

        // Per unit organisasi
        db
          .select({
            name: employee.unit_organisasi,
            value: count(),
          })
          .from(employee)
          .where(and(whereClause, isNotNull(employee.unit_organisasi)))
          .groupBy(employee.unit_organisasi)
          .orderBy(desc(sql`count(*)`)),

        // Per provider
        db
          .select({
            name: employee.provider,
            value: count(),
          })
          .from(employee)
          .where(and(whereClause, isNotNull(employee.provider)))
          .groupBy(employee.provider)
          .orderBy(desc(sql`count(*)`)),

        // Top 20 jabatan
        db
          .select({
            name: employee.kelompok_jabatan,
            value: count(),
          })
          .from(employee)
          .where(and(whereClause, isNotNull(employee.kelompok_jabatan)))
          .groupBy(employee.kelompok_jabatan)
          .orderBy(desc(sql`count(*)`))
          .limit(20),

        // Gender
        db
          .select({
            name: employee.jenis_kelamin,
            value: count(),
          })
          .from(employee)
          .where(and(whereClause, isNotNull(employee.jenis_kelamin)))
          .groupBy(employee.jenis_kelamin),
      ]);

    const row = statsRows[0];

    const genderMap: { L: number; P: number } = { L: 0, P: 0 };
    for (const g of genderRows) {
      if (g.name === "L") genderMap.L = Number(g.value);
      if (g.name === "P") genderMap.P = Number(g.value);
    }

    const data: AssistantContext = {
      total: Number(row?.total ?? 0),
      pegawaiTetap: Number(row?.pegawaiTetap ?? 0),
      pkwt: Number(row?.pkwt ?? 0),
      tad: Number(row?.tad ?? 0),
      aktif: Number(row?.aktif ?? 0),
      nonAktif: Number(row?.nonAktif ?? 0),
      tadPaketSdm: Number(row?.tadPaketSdm ?? 0),
      tadPaketPekerjaan: Number(row?.tadPaketPekerjaan ?? 0),
      kontrakBerakhir30: Number(row?.kontrakBerakhir30 ?? 0),
      kontrakBerakhir90: Number(row?.kontrakBerakhir90 ?? 0),
      perUnit: unitRows
        .filter((r): r is { name: string; value: number } => r.name !== null)
        .map((r) => ({ unit: r.name, total: Number(r.value) })),
      perProvider: providerRows
        .filter((r): r is { name: string; value: number } => r.name !== null)
        .map((r) => ({ provider: r.name, total: Number(r.value) })),
      perJabatan: jabatanRows
        .filter((r): r is { name: string; value: number } => r.name !== null)
        .map((r) => ({ jabatan: r.name, total: Number(r.value) })),
      perJenisKelamin: genderMap,
      providerUser: providerScope,
      namaUser: sessionUser.fullName,
      roleUser: sessionUser.role,
    };

    return NextResponse.json<ApiResponse<AssistantContext>>({
      success: true,
      data,
    });
  } catch (err) {
    logger.error("Failed to fetch assistant context", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat data konteks asisten");
  }
}
