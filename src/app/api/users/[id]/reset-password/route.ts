import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, user } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

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

async function requireSuperAdmin(): Promise<
  | {
      id: string;
      full_name: string;
      email: string | null;
      role: string;
    }
  | NextResponse<ApiResponse<never>>
> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const rows = await db
    .select({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .where(eq(user.supabase_auth_id, authUser.id))
    .limit(1);

  const appUser = rows[0];
  if (!appUser) {
    return fail(403, "FORBIDDEN", "Akun tidak terdaftar");
  }
  if (appUser.role !== "super_admin") {
    return fail(
      403,
      "FORBIDDEN",
      "Hanya Super Admin yang dapat mengakses manajemen pengguna",
    );
  }
  return appUser;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id) {
    return fail(400, "INVALID_ID", "ID pengguna tidak valid");
  }

  if (id === auth.id) {
    return fail(
      400,
      "SELF_RESET_FORBIDDEN",
      "Tidak dapat mereset password akun sendiri",
    );
  }

  try {
    const rows = await db
      .select({
        id: user.id,
        nip: user.nip,
        full_name: user.full_name,
        supabase_auth_id: user.supabase_auth_id,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    const target = rows[0];
    if (!target) {
      return fail(404, "NOT_FOUND", "Pengguna tidak ditemukan");
    }

    // Password default = NIP.
    const newPassword = target.nip;

    const supabaseAdmin = createSupabaseAdminClient();
    const updateRes = await supabaseAdmin.auth.admin.updateUserById(
      target.supabase_auth_id,
      { password: newPassword },
    );

    if (updateRes.error) {
      logger.error("Failed to reset supabase auth password", updateRes.error);
      return fail(
        500,
        "AUTH_RESET_FAILED",
        updateRes.error.message ?? "Gagal mereset password",
      );
    }

    // Activity log — non-fatal.
    try {
      await db.insert(activityLog).values({
        user_id: auth.id,
        user_email: auth.email,
        user_name: auth.full_name,
        activity: "update_user",
        description: `${auth.full_name} mereset password pengguna ${target.full_name} (${target.nip}) ke NIP`,
        target_type: "user",
        target_label: target.full_name,
        metadata: { action: "reset_password" },
        ip_address: request.headers.get("x-forwarded-for") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (err) {
      logger.error("Failed to log reset_password activity", err);
    }

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: {
        message: `Password berhasil direset ke NIP (${target.nip})`,
      },
    });
  } catch (err) {
    logger.error("Failed to reset password", err);
    return fail(500, "INTERNAL_ERROR", "Gagal mereset password");
  }
}
