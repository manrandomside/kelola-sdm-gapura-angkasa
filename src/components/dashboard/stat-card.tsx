import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatCardColor =
  | "primary"
  | "green"
  | "blue"
  | "violet"
  | "orange"
  | "red"
  | "gray"
  | "amber"
  | "pink";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
  color?: StatCardColor;
  compact?: boolean;
}

const COLOR_BG: Record<StatCardColor, string> = {
  primary: "bg-primary/10 text-primary",
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
  gray: "bg-gray-100 text-gray-600",
  amber: "bg-amber-50 text-amber-600",
  pink: "bg-pink-50 text-pink-600",
};

const COLOR_TEXT: Record<StatCardColor, string> = {
  primary: "text-primary",
  green: "text-green-700",
  blue: "text-blue-700",
  violet: "text-violet-700",
  orange: "text-orange-700",
  red: "text-red-700",
  gray: "text-gray-700",
  amber: "text-amber-700",
  pink: "text-pink-700",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color = "primary",
  compact = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group glass-card flex items-center gap-4 rounded-2xl p-5 transition-all hover:bg-white/80 hover:shadow-md",
        compact && "p-4",
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          COLOR_BG[color],
          compact && "size-10",
        )}
      >
        <Icon className={cn("size-6", compact && "size-5")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {title}
        </p>
        <p
          className={cn(
            "mt-0.5 text-2xl font-bold tabular-nums",
            COLOR_TEXT[color],
            compact && "text-xl",
          )}
        >
          {value.toLocaleString("id-ID")}
        </p>
        {description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
