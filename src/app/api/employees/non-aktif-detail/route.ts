import { NextResponse } from "next/server";
import { and, eq, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface NonAktifEmployee {
  id: number;
  nip: string;
  namaLengkap: string;
  namaJabatan: string | null;
  unitOrganisasi: string | null;
  provider: string | null;
  statusKerja: string | null;
  tmtBerakhirKerja: string | null;
  tmtPensiun: string | null;
}

interface NonAktifGroup {
  count: number;
  employees: NonAktifEmployee[];
}

interface NonAktifDetailData {
  kontrakHabis: NonAktifGroup;
  pensiun: NonAktifGroup;
  nonAktifManual: NonAktifGroup;
  totalNonAktif: number;
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

const SELECT_FIELDS = {
  id: employee.id,
  nip: employee.nip,
  namaLengkap: employee.nama_lengkap,
  namaJabatan: employee.nama_jabatan,
  unitOrganisasi: employee.unit_organisasi,
  provider: employee.provider,
  statusKerja: employee.status_kerja,
  tmtBerakhirKerja: employee.tmt_berakhir_kerja,
  tmtPensiun: employee.tmt_pensiun,
} as const;

export async function GET(): Promise<NextResponse<ApiResponse<NonAktifDetailData>>> {
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
    const baseConditions: SQL[] = [eq(employee.status, "active")];
    if (providerScope) {
      baseConditions.push(eq(employee.provider, providerScope));
    }

    // Grup 1: Kontrak Habis — tmt_berakhir_kerja < today
    const kontrakHabisRows = await db
      .select(SELECT_FIELDS)
      .from(employee)
      .where(
        and(
          ...baseConditions,
          sql`${employee.tmt_berakhir_kerja} IS NOT NULL`,
          sql`${employee.tmt_berakhir_kerja}::date < CURRENT_DATE`,
        ),
      )
      .orderBy(employee.nama_lengkap);

    // Grup 2: Pensiun — status_kerja = 'Pensiun'
    const pensiunRows = await db
      .select(SELECT_FIELDS)
      .from(employee)
      .where(
        and(
          ...baseConditions,
          eq(employee.status_kerja, "Pensiun"),
        ),
      )
      .orderBy(employee.nama_lengkap);

    // Grup 3: Non Aktif Manual — status_kerja = 'Non Aktif' AND (tmt_berakhir_kerja IS NULL OR >= today)
    const nonAktifManualRows = await db
      .select(SELECT_FIELDS)
      .from(employee)
      .where(
        and(
          ...baseConditions,
          eq(employee.status_kerja, "Non Aktif"),
          or(
            sql`${employee.tmt_berakhir_kerja} IS NULL`,
            sql`${employee.tmt_berakhir_kerja}::date >= CURRENT_DATE`,
          ),
        ),
      )
      .orderBy(employee.nama_lengkap);

    function mapRow(row: typeof kontrakHabisRows[number]): NonAktifEmployee {
      return {
        id: row.id,
        nip: row.nip,
        namaLengkap: row.namaLengkap,
        namaJabatan: row.namaJabatan,
        unitOrganisasi: row.unitOrganisasi,
        provider: row.provider,
        statusKerja: row.statusKerja,
        tmtBerakhirKerja: row.tmtBerakhirKerja,
        tmtPensiun: row.tmtPensiun,
      };
    }

    const kontrakHabis = kontrakHabisRows.map(mapRow);
    const pensiun = pensiunRows.map(mapRow);
    const nonAktifManual = nonAktifManualRows.map(mapRow);

    const data: NonAktifDetailData = {
      kontrakHabis: { count: kontrakHabis.length, employees: kontrakHabis },
      pensiun: { count: pensiun.length, employees: pensiun },
      nonAktifManual: { count: nonAktifManual.length, employees: nonAktifManual },
      totalNonAktif: kontrakHabis.length + pensiun.length + nonAktifManual.length,
    };

    return NextResponse.json<ApiResponse<NonAktifDetailData>>({
      success: true,
      data,
    });
  } catch (err) {
    logger.error("Failed to fetch non-aktif detail", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat detail karyawan non-aktif");
  }
}
