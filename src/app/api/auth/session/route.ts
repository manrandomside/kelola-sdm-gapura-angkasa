import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

import type { UserRole } from "@/lib/constants/enums";
import type { ApiResponse } from "@/types/api";
import type { SessionUser, UserStatus } from "@/types/user";

interface SessionResponse {
  user: SessionUser;
}

function unauthorized(
  message = "Sesi tidak valid",
): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code: "UNAUTHORIZED", message } },
    { status: 401 },
  );
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return unauthorized();
    }

    const rows = await db
      .select({
        id: user.id,
        nip: user.nip,
        full_name: user.full_name,
        role: user.role,
        email: user.email,
        status: user.status,
        provider: user.provider,
      })
      .from(user)
      .where(eq(user.supabase_auth_id, authUser.id))
      .limit(1);

    const appUser = rows[0];

    if (!appUser) {
      await supabase.auth.signOut();
      return unauthorized("Akun tidak terdaftar dalam sistem");
    }

    if (appUser.status !== "active") {
      await supabase.auth.signOut();
      return unauthorized("Akun Anda tidak aktif");
    }

    const session: SessionUser = {
      id: appUser.id,
      nip: appUser.nip,
      full_name: appUser.full_name,
      role: appUser.role as UserRole,
      email: appUser.email,
      status: appUser.status as UserStatus,
      provider: appUser.provider,
    };

    return NextResponse.json<ApiResponse<SessionResponse>>({
      success: true,
      data: { user: session },
    });
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Gagal memuat sesi" } },
      { status: 500 },
    );
  }
}
