import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { generateImportTemplate } from "@/lib/utils/excel";

import type { ApiResponse } from "@/types/api";

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

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const appUserRows = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.supabase_auth_id, authUser.id))
    .limit(1);

  const appUser = appUserRows[0];
  if (!appUser) {
    return fail(403, "FORBIDDEN", "Akun tidak terdaftar");
  }
  if (appUser.role !== "admin" && appUser.role !== "super_admin") {
    return fail(
      403,
      "FORBIDDEN",
      "Anda tidak memiliki akses untuk mengunduh template",
    );
  }

  try {
    const buffer = generateImportTemplate();
    const fileName = "template-import-sdm-gapura-angkasa.xlsx";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("Failed to generate import template", err);
    return fail(500, "INTERNAL_ERROR", "Gagal membuat template import");
  }
}
