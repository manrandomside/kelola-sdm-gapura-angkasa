import { NextResponse } from "next/server";
import { and, asc, eq, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { unit } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

import type { ApiResponse } from "@/types/api";

interface UnitItem {
  id: number;
  unit_organisasi: string;
  kode: string;
  nama: string;
}

interface UnitListResponse {
  units: UnitItem[];
}

export async function GET(
  request: Request,
): Promise<NextResponse<ApiResponse<UnitListResponse>>> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sesi tidak valid" } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const unitOrganisasi = searchParams.get("unit_organisasi")?.trim() || null;

  const conditions: SQL[] = [eq(unit.is_active, true)];
  if (unitOrganisasi) {
    conditions.push(eq(unit.unit_organisasi, unitOrganisasi));
  }

  try {
    const rows = await db
      .select({
        id: unit.id,
        unit_organisasi: unit.unit_organisasi,
        kode: unit.kode,
        nama: unit.nama,
      })
      .from(unit)
      .where(and(...conditions))
      .orderBy(asc(unit.sort_order), asc(unit.nama));

    return NextResponse.json<ApiResponse<UnitListResponse>>({
      success: true,
      data: { units: rows },
    });
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal memuat data unit" } },
      { status: 500 },
    );
  }
}
