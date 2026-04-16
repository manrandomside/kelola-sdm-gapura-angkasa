import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

import type { ApiResponse } from "@/types/api";

interface ValidateResponse {
  available: boolean;
  message?: string;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ nip: string }> },
): Promise<NextResponse<ApiResponse<ValidateResponse>>> {
  try {
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

    const { nip } = await context.params;
    const value = decodeURIComponent(nip ?? "").trim();
    if (!value) {
      return NextResponse.json<ApiResponse<ValidateResponse>>({
        success: true,
        data: { available: false, message: "NIP wajib diisi" },
      });
    }

    const rows = await db
      .select({ id: employee.id })
      .from(employee)
      .where(eq(employee.nip, value))
      .limit(1);

    if (rows.length > 0) {
      return NextResponse.json<ApiResponse<ValidateResponse>>({
        success: true,
        data: { available: false, message: "NIP sudah terdaftar" },
      });
    }

    return NextResponse.json<ApiResponse<ValidateResponse>>({
      success: true,
      data: { available: true },
    });
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal memvalidasi NIP" } },
      { status: 500 },
    );
  }
}
