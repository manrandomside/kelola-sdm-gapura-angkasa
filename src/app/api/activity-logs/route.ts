import { NextResponse } from "next/server";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface ActivityLogItem {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  activity: string;
  description: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: unknown;
  ip_address: string | null;
  created_at: string;
}

interface ActivityLogListResponse {
  activities: ActivityLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Whitelist kolom yang boleh dipakai untuk sorting.
const SORTABLE_COLUMNS = {
  created_at: activityLog.created_at,
  activity: activityLog.activity,
  user_name: activityLog.user_name,
} as const;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

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

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max?: number,
): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  if (max && n > max) return max;
  return n;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const { searchParams } = new URL(request.url);

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);
  const activity = searchParams.get("activity")?.trim() || null;
  const userId = searchParams.get("user_id")?.trim() || null;
  const targetType = searchParams.get("target_type")?.trim() || null;
  const search = searchParams.get("search")?.trim() ?? "";

  const sortParam = searchParams.get("sort") ?? "created_at";
  const sortKey: SortableColumn =
    sortParam in SORTABLE_COLUMNS
      ? (sortParam as SortableColumn)
      : "created_at";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const conditions: SQL[] = [];
  if (activity) conditions.push(eq(activityLog.activity, activity));
  if (userId) conditions.push(eq(activityLog.user_id, userId));
  if (targetType) conditions.push(eq(activityLog.target_type, targetType));
  if (search.length > 0) {
    const pattern = `%${search}%`;
    const searchCondition = or(
      ilike(activityLog.description, pattern),
      ilike(activityLog.target_label, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = SORTABLE_COLUMNS[sortKey];
  const orderBy = order === "asc" ? asc(sortColumn) : desc(sortColumn);

  try {
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: activityLog.id,
          user_id: activityLog.user_id,
          user_name: activityLog.user_name,
          user_email: activityLog.user_email,
          activity: activityLog.activity,
          description: activityLog.description,
          target_type: activityLog.target_type,
          target_id: activityLog.target_id,
          target_label: activityLog.target_label,
          metadata: activityLog.metadata,
          ip_address: activityLog.ip_address,
          created_at: activityLog.created_at,
        })
        .from(activityLog)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: count() })
        .from(activityLog)
        .where(whereClause),
    ]);

    const total = Number(totalRows[0]?.value ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const activities: ActivityLogItem[] = rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      activity: row.activity,
      description: row.description,
      target_type: row.target_type,
      target_id: row.target_id,
      target_label: row.target_label,
      metadata: row.metadata,
      ip_address: row.ip_address,
      created_at: row.created_at.toISOString(),
    }));

    return NextResponse.json<ApiResponse<ActivityLogListResponse>>({
      success: true,
      data: {
        activities,
        pagination: { page, limit, total, totalPages },
      },
    });
  } catch (err) {
    logger.error("Failed to fetch activity logs", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat activity log");
  }
}
