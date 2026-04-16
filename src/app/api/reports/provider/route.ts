import { NextResponse } from "next/server";
import { and, asc, count, eq, sql, type SQL } from "drizzle-orm";

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
  let providerParam = url.searchParams.get("provider");

  if (!providerParam) {
    return fail(400, "BAD_REQUEST", "Parameter provider tidak valid");
  }

  // Enforce provider scope
  if (providerScope && providerParam !== providerScope) {
    providerParam = providerScope;
  }

  const base: SQL[] = [
    eq(employee.status, "active"),
    eq(employee.provider, providerParam),
  ];

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
      })
      .from(employee)
      .where(and(...base));

    const today = new Date().toISOString().split("T")[0];
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

    // Contract counts
    const [contracts] = await db
      .select({
        kontrakAktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Aktif')`,
        akan30: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja} >= ${today}::date and ${employee.tmt_berakhir_kerja} <= ${in30}::date)`,
        akan90: sql<number>`count(*) filter (where ${employee.tmt_berakhir_kerja} >= ${today}::date and ${employee.tmt_berakhir_kerja} <= ${in90}::date)`,
      })
      .from(employee)
      .where(and(...base));

    // Employee list
    const karyawan = await db
      .select({
        nip: employee.nip,
        namaLengkap: employee.nama_lengkap,
        namaJabatan: employee.nama_jabatan,
        unitOrganisasi: employee.unit_organisasi,
        statusPegawai: employee.status_pegawai,
        statusKerja: employee.status_kerja,
        tmtMulaiKerja: employee.tmt_mulai_kerja,
        tmtBerakhirKerja: employee.tmt_berakhir_kerja,
      })
      .from(employee)
      .where(and(...base))
      .orderBy(asc(employee.nama_lengkap));

    return NextResponse.json({
      success: true,
      data: {
        provider: providerParam,
        ringkasan: {
          total: summary?.total ?? 0,
          aktif: Number(summary?.aktif ?? 0),
          nonAktif: Number(summary?.nonAktif ?? 0),
          pegawaiTetap: Number(summary?.pegawaiTetap ?? 0),
          pkwt: Number(summary?.pkwt ?? 0),
          tad: Number(summary?.tad ?? 0),
        },
        kontrakAktif: Number(contracts?.kontrakAktif ?? 0),
        kontrakAkanBerakhir30: Number(contracts?.akan30 ?? 0),
        kontrakAkanBerakhir90: Number(contracts?.akan90 ?? 0),
        karyawan: karyawan.map((r, idx) => ({
          no: idx + 1,
          nip: r.nip,
          namaLengkap: r.namaLengkap,
          namaJabatan: r.namaJabatan ?? "-",
          unitOrganisasi: r.unitOrganisasi ?? "-",
          statusPegawai: r.statusPegawai ?? "-",
          statusKerja: r.statusKerja ?? "-",
          tmtMulaiKerja: r.tmtMulaiKerja ?? null,
          tmtBerakhirKerja: r.tmtBerakhirKerja ?? null,
        })),
      },
    });
  } catch (err) {
    logger.error("Failed to fetch provider report", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat data laporan provider");
  }
}
