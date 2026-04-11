import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface MigrationResult {
  columnAdded: boolean;
  superadminUpdated: boolean;
}

export async function POST(): Promise<NextResponse<ApiResponse<MigrationResult>>> {
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
    // Add provider column if it does not exist yet.
    await db.execute(sql`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS provider VARCHAR(100)
    `);

    // Update the existing SUPERADMIN account to set provider.
    const updateResult = await db
      .update(user)
      .set({ provider: "PT Gapura Angkasa", updated_at: new Date() })
      .where(eq(user.nip, "SUPERADMIN"))
      .returning({ id: user.id });

    const superadminUpdated = updateResult.length > 0;

    logger.info("add-provider-column migration completed", {
      superadminUpdated,
    });

    return NextResponse.json({
      success: true,
      data: {
        columnAdded: true,
        superadminUpdated,
      },
    });
  } catch (err) {
    logger.error("add-provider-column migration failed", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Migrasi gagal" } },
      { status: 500 },
    );
  }
}
