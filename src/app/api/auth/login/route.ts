import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { activityLog, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { UserRole } from "@/lib/constants/enums";
import type { ApiResponse } from "@/types/api";
import type { SessionUser, UserStatus } from "@/types/user";

const LoginSchema = z.object({
  nip: z.string().trim().min(1, "NIP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

interface LoginResponse {
  user: SessionUser;
}

function nipToEmail(nip: string): string {
  return `${nip.toLowerCase()}@gapura.internal`;
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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_BODY", "Body request tidak valid");
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "VALIDATION_ERROR", "NIP dan password wajib diisi");
  }
  const { nip, password } = parsed.data;

  const supabase = await createClient();
  const email = nipToEmail(nip);

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.user) {
    logger.warn("Login failed", { nip, message: signInError?.message });
    return fail(401, "INVALID_CREDENTIALS", "NIP atau password salah");
  }

  // Lookup application user by Supabase auth id.
  const rows = await db
    .select({
      id: user.id,
      nip: user.nip,
      full_name: user.full_name,
      role: user.role,
      email: user.email,
      status: user.status,
    })
    .from(user)
    .where(eq(user.supabase_auth_id, signInData.user.id))
    .limit(1);

  const appUser = rows[0];

  if (!appUser) {
    await supabase.auth.signOut();
    return fail(403, "NOT_REGISTERED", "Akun tidak terdaftar dalam sistem");
  }

  if (appUser.status !== "active") {
    await supabase.auth.signOut();
    return fail(
      403,
      "USER_INACTIVE",
      "Akun Anda tidak aktif. Hubungi administrator.",
    );
  }

  // Mark last_login_at and write activity log. Failures are non-fatal.
  try {
    await db
      .update(user)
      .set({ last_login_at: new Date(), updated_at: new Date() })
      .where(eq(user.id, appUser.id));

    await db.insert(activityLog).values({
      user_id: appUser.id,
      user_email: appUser.email,
      user_name: appUser.full_name,
      activity: "login",
      description: `${appUser.full_name} login ke sistem`,
      ip_address: request.headers.get("x-forwarded-for") ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
    });
  } catch (err) {
    logger.error("Failed to record login bookkeeping", err);
  }

  const session: SessionUser = {
    id: appUser.id,
    nip: appUser.nip,
    full_name: appUser.full_name,
    role: appUser.role as UserRole,
    email: appUser.email,
    status: appUser.status as UserStatus,
  };

  return NextResponse.json<ApiResponse<LoginResponse>>({
    success: true,
    data: { user: session },
  });
}
