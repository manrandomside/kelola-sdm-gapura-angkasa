import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { subUnit } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

import type { ApiResponse } from "@/types/api";

interface SubUnitItem {
  id: number;
  unit_id: number;
  nama: string;
  kode: string | null;
}

interface SubUnitListResponse {
  sub_units: SubUnitItem[];
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<SubUnitListResponse>>> {
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

  const { id } = await context.params;
  const unitId = Number.parseInt(id, 10);
  if (!Number.isFinite(unitId) || unitId < 1) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INVALID_ID", message: "ID unit tidak valid" } },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      id: subUnit.id,
      unit_id: subUnit.unit_id,
      nama: subUnit.nama,
      kode: subUnit.kode,
    })
    .from(subUnit)
    .where(and(eq(subUnit.unit_id, unitId), eq(subUnit.is_active, true)))
    .orderBy(asc(subUnit.sort_order), asc(subUnit.nama));

  return NextResponse.json<ApiResponse<SubUnitListResponse>>({
    success: true,
    data: { sub_units: rows },
  });
}
