import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

import type { ApiResponse } from "@/types/api";

interface OrganizationItem {
  id: number;
  kode_organisasi: string;
  nama_organisasi: string;
  unit_organisasi: string;
}

interface OrganizationListResponse {
  organizations: OrganizationItem[];
}

export async function GET(): Promise<
  NextResponse<ApiResponse<OrganizationListResponse>>
> {
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

  try {
    const rows = await db
      .select({
        id: organization.id,
        kode_organisasi: organization.kode_organisasi,
        nama_organisasi: organization.nama_organisasi,
        unit_organisasi: organization.unit_organisasi,
      })
      .from(organization)
      .where(eq(organization.is_active, true))
      .orderBy(asc(organization.sort_order), asc(organization.nama_organisasi));

    return NextResponse.json<ApiResponse<OrganizationListResponse>>({
      success: true,
      data: { organizations: rows },
    });
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal memuat data organisasi" } },
      { status: 500 },
    );
  }
}
