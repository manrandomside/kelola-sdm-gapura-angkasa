import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { chatMessage, conversation } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface ConversationListItem {
  id: string;
  title: string;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversationListResponse {
  conversations: ConversationListItem[];
}

interface ConversationCreateResponse {
  conversation: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
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

// GET /api/assistant/conversations — List user's conversations
export async function GET(): Promise<
  NextResponse<ApiResponse<ConversationListResponse>>
> {
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

  try {
    // Get conversations with last message via subquery
    const rows = await db
      .select({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        lastMessage: sql<string | null>`(
          SELECT SUBSTRING(cm.content, 1, 50)
          FROM chat_message cm
          WHERE cm.conversation_id = ${conversation.id}
          ORDER BY cm.created_at DESC
          LIMIT 1
        )`,
      })
      .from(conversation)
      .where(eq(conversation.user_id, sessionUser.id))
      .orderBy(desc(conversation.updated_at))
      .limit(50);

    const conversations: ConversationListItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      lastMessage: r.lastMessage,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json<ApiResponse<ConversationListResponse>>({
      success: true,
      data: { conversations },
    });
  } catch (err) {
    logger.error("Failed to list conversations", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat daftar percakapan");
  }
}

// POST /api/assistant/conversations — Create new conversation
export async function POST(): Promise<
  NextResponse<ApiResponse<ConversationCreateResponse>>
> {
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

  try {
    const rows = await db
      .insert(conversation)
      .values({
        user_id: sessionUser.id,
        title: "Percakapan Baru",
      })
      .returning();

    const row = rows[0];

    return NextResponse.json<ApiResponse<ConversationCreateResponse>>({
      success: true,
      data: {
        conversation: {
          id: row.id,
          title: row.title,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        },
      },
    });
  } catch (err) {
    logger.error("Failed to create conversation", err);
    return fail(500, "INTERNAL_ERROR", "Gagal membuat percakapan baru");
  }
}
