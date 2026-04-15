import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { chatMessage, conversation } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface ConversationDetail {
  conversation: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: {
    id: string;
    role: string;
    content: string;
    provider: string | null;
    createdAt: string;
  }[];
}

interface UpdateResponse {
  conversation: {
    id: string;
    title: string;
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

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/assistant/conversations/[id] — Get conversation with messages
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<ApiResponse<ConversationDetail>>> {
  const { id } = await context.params;

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
    // Get conversation with ownership check
    const conv = await db.query.conversation.findFirst({
      where: and(
        eq(conversation.id, id),
        eq(conversation.user_id, sessionUser.id),
      ),
    });

    if (!conv) {
      return fail(404, "NOT_FOUND", "Percakapan tidak ditemukan");
    }

    // Get messages sorted by created_at ASC
    const messages = await db
      .select({
        id: chatMessage.id,
        role: chatMessage.role,
        content: chatMessage.content,
        provider: chatMessage.provider,
        createdAt: chatMessage.created_at,
      })
      .from(chatMessage)
      .where(eq(chatMessage.conversation_id, id))
      .orderBy(asc(chatMessage.created_at));

    return NextResponse.json<ApiResponse<ConversationDetail>>({
      success: true,
      data: {
        conversation: {
          id: conv.id,
          title: conv.title,
          createdAt: conv.created_at.toISOString(),
          updatedAt: conv.updated_at.toISOString(),
        },
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          provider: m.provider,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    logger.error("Failed to get conversation", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat percakapan");
  }
}

// PUT /api/assistant/conversations/[id] — Rename conversation
export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<ApiResponse<UpdateResponse>>> {
  const { id } = await context.params;

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

  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_BODY", "Request body tidak valid");
  }

  if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
    return fail(400, "INVALID_TITLE", "Judul tidak boleh kosong");
  }

  try {
    // Ownership check
    const conv = await db.query.conversation.findFirst({
      where: and(
        eq(conversation.id, id),
        eq(conversation.user_id, sessionUser.id),
      ),
    });

    if (!conv) {
      return fail(404, "NOT_FOUND", "Percakapan tidak ditemukan");
    }

    const rows = await db
      .update(conversation)
      .set({
        title: body.title.trim().slice(0, 255),
        updated_at: new Date(),
      })
      .where(eq(conversation.id, id))
      .returning();

    const updated = rows[0];

    return NextResponse.json<ApiResponse<UpdateResponse>>({
      success: true,
      data: {
        conversation: {
          id: updated.id,
          title: updated.title,
          updatedAt: updated.updated_at.toISOString(),
        },
      },
    });
  } catch (err) {
    logger.error("Failed to rename conversation", err);
    return fail(500, "INTERNAL_ERROR", "Gagal mengubah nama percakapan");
  }
}

// DELETE /api/assistant/conversations/[id] — Delete conversation
export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  const { id } = await context.params;

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
    // Ownership check
    const conv = await db.query.conversation.findFirst({
      where: and(
        eq(conversation.id, id),
        eq(conversation.user_id, sessionUser.id),
      ),
    });

    if (!conv) {
      return fail(404, "NOT_FOUND", "Percakapan tidak ditemukan");
    }

    // Cascade delete will remove chat_messages too
    await db.delete(conversation).where(eq(conversation.id, id));

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
    });
  } catch (err) {
    logger.error("Failed to delete conversation", err);
    return fail(500, "INTERNAL_ERROR", "Gagal menghapus percakapan");
  }
}
