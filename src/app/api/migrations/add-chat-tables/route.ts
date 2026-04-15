import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface MigrationResult {
  conversationTable: string;
  chatMessageTable: string;
  indexes: string;
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

export async function POST(): Promise<NextResponse<ApiResponse<MigrationResult>>> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  // Only super_admin can run migrations
  const dbUser = await db.query.user.findFirst({
    where: eq(user.supabase_auth_id, authUser.id),
  });

  if (!dbUser || dbUser.role !== "super_admin") {
    return fail(403, "FORBIDDEN", "Hanya super_admin yang bisa menjalankan migrasi");
  }

  try {
    // Create conversation table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversation (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL DEFAULT 'Percakapan Baru',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create chat_message table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chat_message (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        provider VARCHAR(20),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes (IF NOT EXISTS)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_conversation_user ON conversation(user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_conversation_updated ON conversation(updated_at DESC)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_chat_message_conversation ON chat_message(conversation_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_chat_message_created ON chat_message(created_at ASC)
    `);

    logger.info("Migration add-chat-tables completed successfully");

    return NextResponse.json<ApiResponse<MigrationResult>>({
      success: true,
      data: {
        conversationTable: "created",
        chatMessageTable: "created",
        indexes: "created",
      },
    });
  } catch (err) {
    logger.error("Migration add-chat-tables failed", err);
    const message = err instanceof Error ? err.message : "Migration failed";
    return fail(500, "MIGRATION_ERROR", message);
  }
}
