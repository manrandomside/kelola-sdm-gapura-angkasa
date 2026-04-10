import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface FixPkwtResult {
  updatedCount: number;
}

export async function POST(): Promise<NextResponse<ApiResponse<FixPkwtResult>>> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sesi tidak valid" } },
      { status: 401 },
    );
  }

  // Only super_admin can run migrations.
  const dbUser = await db.query.user.findFirst({
    where: eq(user.supabase_auth_id, authUser.id),
  });

  if (!dbUser || dbUser.role !== "super_admin") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Hanya super_admin yang dapat menjalankan migrasi" } },
      { status: 403 },
    );
  }

  try {
    // Update employees where status_kontrak = 'PKWT' but status_pegawai is still 'TAD'.
    const result = await db
      .update(employee)
      .set({
        status_pegawai: "PKWT",
        updated_at: new Date(),
      })
      .where(
        and(
          eq(employee.status_kontrak, "PKWT"),
          eq(employee.status_pegawai, "TAD"),
        ),
      )
      .returning({ id: employee.id });

    const updatedCount = result.length;

    logger.info(`fix-pkwt migration: updated ${updatedCount} employees`);

    return NextResponse.json({
      success: true,
      data: { updatedCount },
    });
  } catch (err) {
    logger.error("fix-pkwt migration failed", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Migrasi gagal" } },
      { status: 500 },
    );
  }
}
