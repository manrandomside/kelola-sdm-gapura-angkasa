"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

export interface ActivityLogItem {
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

export interface ActivityLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ActivityLogListData {
  activities: ActivityLogItem[];
  pagination: ActivityLogPagination;
}

export interface UseActivityLogsParams {
  page: number;
  limit: number;
  activity: string | null;
  activityGroup?: string | null;
  search: string;
  sort: string;
  order: "asc" | "desc";
  dateFrom?: string | null;
  dateTo?: string | null;
}

function buildQueryString(params: UseActivityLogsParams): string {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  if (params.activity) sp.set("activity", params.activity);
  if (params.activityGroup) sp.set("activity_group", params.activityGroup);
  if (params.search) sp.set("search", params.search);
  sp.set("sort", params.sort);
  sp.set("order", params.order);
  if (params.dateFrom) sp.set("date_from", params.dateFrom);
  if (params.dateTo) sp.set("date_to", params.dateTo);
  return sp.toString();
}

async function fetchActivityLogs(
  params: UseActivityLogsParams,
): Promise<ActivityLogListData> {
  const qs = buildQueryString(params);
  const res = await fetch(`/api/activity-logs?${qs}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const json = (await res.json()) as ApiResponse<ActivityLogListData>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export function useActivityLogs(params: UseActivityLogsParams) {
  return useQuery({
    queryKey: ["activity-logs", params],
    queryFn: () => fetchActivityLogs(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
