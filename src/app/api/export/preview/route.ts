import { NextResponse } from "next/server";
import { and, count, eq, gte, lte, inArray, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";

import type { ApiResponse } from "@/types/api";

export const dynamic = "force-dynamic";

interface CustomFilters {
  statusKerja?: string;
  statusPegawai?: string;
  provider?: string;
  unitOrganisasi?: string;
  tmtBerakhirFrom?: string;
  tmtBerakhirTo?: string;
}

interface CurrentFilters {
  search?: string;
  status_pegawai?: string;
  status_kontrak?: string;
  unit_organisasi?: string;
  provider?: string;
  status_kerja?: string;
}

interface PreviewRequestBody {
  mode: "all" | "selected" | "custom";
  selectedIds?: number[];
  filters?: CustomFilters;
  currentFilters?: CurrentFilters;
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

  let body: PreviewRequestBody;
  try {
    body = (await request.json()) as PreviewRequestBody;
  } catch {
    return fail(400, "BAD_REQUEST", "Body tidak valid");
  }

  const { mode, selectedIds, filters, currentFilters } = body;

  const conditions: SQL[] = [eq(employee.status, "active")];

  // Provider scope always applies
  if (providerScope) {
    conditions.push(eq(employee.provider, providerScope));
  }

  if (mode === "selected") {
    if (!selectedIds || selectedIds.length === 0) {
      return NextResponse.json({ success: true, data: { count: 0 } });
    }
    conditions.push(inArray(employee.id, selectedIds));
  } else if (mode === "custom") {
    if (filters?.statusKerja) {
      conditions.push(eq(employee.status_kerja, filters.statusKerja));
    }
    if (filters?.statusPegawai) {
      conditions.push(eq(employee.status_pegawai, filters.statusPegawai));
    }
    if (filters?.provider && !providerScope) {
      // Only apply provider filter if user is not already scoped
      conditions.push(eq(employee.provider, filters.provider));
    }
    if (filters?.unitOrganisasi) {
      conditions.push(eq(employee.unit_organisasi, filters.unitOrganisasi));
    }
    if (filters?.tmtBerakhirFrom) {
      conditions.push(gte(employee.tmt_berakhir_kerja, filters.tmtBerakhirFrom));
    }
    if (filters?.tmtBerakhirTo) {
      conditions.push(lte(employee.tmt_berakhir_kerja, filters.tmtBerakhirTo));
    }
  } else {
    // mode === 'all' — use currentFilters from table
    if (currentFilters) {
      const search = currentFilters.search?.trim() ?? "";
      if (search.length > 0) {
        const pattern = `%${search}%`;
        const searchCondition = or(
          ilike(employee.nama_lengkap, pattern),
          ilike(employee.nip, pattern),
          ilike(employee.nik, pattern),
        );
        if (searchCondition) conditions.push(searchCondition);
      }
      if (currentFilters.status_pegawai) {
        conditions.push(eq(employee.status_pegawai, currentFilters.status_pegawai));
      }
      if (currentFilters.status_kontrak) {
        conditions.push(eq(employee.status_kontrak, currentFilters.status_kontrak));
      }
      if (currentFilters.unit_organisasi) {
        conditions.push(eq(employee.unit_organisasi, currentFilters.unit_organisasi));
      }
      if (currentFilters.provider) {
        conditions.push(eq(employee.provider, currentFilters.provider));
      }
      if (currentFilters.status_kerja) {
        conditions.push(eq(employee.status_kerja, currentFilters.status_kerja));
      }
    }
  }

  const whereClause = and(...conditions);

  try {
    const [result] = await db
      .select({ value: count() })
      .from(employee)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: { count: result?.value ?? 0 },
    });
  } catch (err) {
    console.error("Failed to count export preview:", err);
    return fail(500, "INTERNAL_ERROR", "Gagal menghitung data");
  }
}
