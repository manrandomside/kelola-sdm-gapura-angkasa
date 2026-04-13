"use client";

import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Activity,
  ArrowRight,
  Download,
  LogIn,
  LogOut,
  Pencil,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

import type { RecentActivity } from "@/hooks/use-dashboard";

interface RecentActivitiesCardProps {
  activities: RecentActivity[];
  isLoading: boolean;
}

interface ActivityVisual {
  icon: LucideIcon;
  bg: string;
  fg: string;
}

function getActivityVisual(activity: string): ActivityVisual {
  if (activity === "login") {
    return { icon: LogIn, bg: "bg-blue-50", fg: "text-blue-600" };
  }
  if (activity === "logout") {
    return { icon: LogOut, bg: "bg-blue-50", fg: "text-blue-600" };
  }
  if (activity.startsWith("create_")) {
    return { icon: UserPlus, bg: "bg-green-50", fg: "text-green-600" };
  }
  if (activity.startsWith("update_") || activity === "update_role") {
    return { icon: Pencil, bg: "bg-amber-50", fg: "text-amber-600" };
  }
  if (activity.startsWith("delete_")) {
    return { icon: Trash2, bg: "bg-red-50", fg: "text-red-600" };
  }
  if (activity === "import_excel") {
    return { icon: Upload, bg: "bg-violet-50", fg: "text-violet-600" };
  }
  if (activity === "export_excel") {
    return { icon: Download, bg: "bg-cyan-50", fg: "text-cyan-600" };
  }
  return { icon: Activity, bg: "bg-gray-100", fg: "text-gray-600" };
}

function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), {
      addSuffix: true,
      locale: idLocale,
    });
  } catch {
    return "";
  }
}

export function RecentActivitiesCard({
  activities,
  isLoading,
}: RecentActivitiesCardProps) {
  return (
    <div className="flex h-full flex-col glass-card-subtle rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Aktivitas Terbaru
        </h3>
        <Link
          href={ROUTES.ACTIVITY_LOGS}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Lihat Semua
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="mt-4 flex-1 space-y-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Activity className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
          </div>
        ) : (
          activities.map((item) => {
            const visual = getActivityVisual(item.activity);
            const Icon = visual.icon;
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    visual.bg,
                  )}
                >
                  <Icon className={cn("size-4", visual.fg)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-foreground">
                    {item.description}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelative(item.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
