import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface LogoutResponse {
  message: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Capture user info before signing out so we can write activity log.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    try {
      const rows = await db
        .select({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        })
        .from(user)
        .where(eq(user.supabase_auth_id, authUser.id))
        .limit(1);

      const appUser = rows[0];
      if (appUser) {
        await db.insert(activityLog).values({
          user_id: appUser.id,
          user_email: appUser.email,
          user_name: appUser.full_name,
          activity: "logout",
          description: `${appUser.full_name} keluar dari sistem`,
          ip_address: request.headers.get("x-forwarded-for") ?? null,
          user_agent: request.headers.get("user-agent") ?? null,
        });
      }
    } catch (err) {
      logger.error("Failed to record logout activity", err);
    }
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.warn("Supabase signOut returned error", { message: error.message });
  }

  return NextResponse.json<ApiResponse<LogoutResponse>>({
    success: true,
    data: { message: "Berhasil keluar" },
  });
}
