import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { activityLog, user } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_BODY", "Body request tidak valid");
  }

  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Data tidak valid";
    return fail(400, "VALIDATION_ERROR", firstError);
  }

  const { currentPassword, newPassword } = parsed.data;

  if (currentPassword === newPassword) {
    return fail(
      400,
      "SAME_PASSWORD",
      "Password baru tidak boleh sama dengan password lama",
    );
  }

  // Get current authenticated user.
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  // Lookup application user.
  const rows = await db
    .select({
      id: user.id,
      nip: user.nip,
      full_name: user.full_name,
      email: user.email,
      supabase_auth_id: user.supabase_auth_id,
    })
    .from(user)
    .where(eq(user.supabase_auth_id, authUser.id))
    .limit(1);

  const appUser = rows[0];
  if (!appUser) {
    return fail(403, "NOT_REGISTERED", "Akun tidak terdaftar dalam sistem");
  }

  // Verify current password by attempting sign-in.
  const email = authUser.email ?? `${appUser.nip.toLowerCase()}@gapura.internal`;
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError) {
    return fail(400, "WRONG_PASSWORD", "Password lama salah");
  }

  // Update password via admin client.
  const supabaseAdmin = createSupabaseAdminClient();
  const updateRes = await supabaseAdmin.auth.admin.updateUserById(
    appUser.supabase_auth_id,
    { password: newPassword },
  );

  if (updateRes.error) {
    logger.error("Failed to update password", updateRes.error);
    return fail(
      500,
      "PASSWORD_UPDATE_FAILED",
      updateRes.error.message ?? "Gagal mengubah password",
    );
  }

  // Activity log (non-fatal).
  try {
    await db.insert(activityLog).values({
      user_id: appUser.id,
      user_email: appUser.email,
      user_name: appUser.full_name,
      activity: "update_user",
      description: `${appUser.full_name} mengubah password akun sendiri`,
      target_type: "user",
      target_label: appUser.full_name,
      metadata: { action: "change_password" },
      ip_address: request.headers.get("x-forwarded-for") ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
    });
  } catch (err) {
    logger.error("Failed to log change_password activity", err);
  }

  return NextResponse.json<ApiResponse<{ message: string }>>({
    success: true,
    data: { message: "Password berhasil diubah" },
  });
}
