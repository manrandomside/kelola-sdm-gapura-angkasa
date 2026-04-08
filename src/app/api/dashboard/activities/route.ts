import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface RecentActivity {
  id: string;
  user_id: string | null;
  user_name: string | null;
  activity: string;
  description: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  created_at: string;
}

interface RecentActivitiesResponse {
  activities: RecentActivity[];
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

export async function GET(): Promise<
  NextResponse<ApiResponse<RecentActivitiesResponse>>
> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  try {
    const rows = await db
      .select({
        id: activityLog.id,
        user_id: activityLog.user_id,
        user_name: activityLog.user_name,
        activity: activityLog.activity,
        description: activityLog.description,
        target_type: activityLog.target_type,
        target_id: activityLog.target_id,
        target_label: activityLog.target_label,
        created_at: activityLog.created_at,
      })
      .from(activityLog)
      .orderBy(desc(activityLog.created_at))
      .limit(10);

    const activities: RecentActivity[] = rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      activity: row.activity,
      description: row.description,
      target_type: row.target_type,
      target_id: row.target_id,
      target_label: row.target_label,
      created_at: row.created_at.toISOString(),
    }));

    return NextResponse.json<ApiResponse<RecentActivitiesResponse>>({
      success: true,
      data: { activities },
    });
  } catch (err) {
    logger.error("Failed to fetch recent activities", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat aktivitas terbaru");
  }
}
