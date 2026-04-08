import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateWITA } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

export type DetailRowType =
  | "text"
  | "date"
  | "badge"
  | "email"
  | "phone";

export type DetailRowBadgeType =
  | "status_kerja"
  | "status_pegawai"
  | "status_kontrak";

interface DetailRowProps {
  label: string;
  value: string | number | null | undefined;
  type?: DetailRowType;
  badgeType?: DetailRowBadgeType;
  className?: string;
}

function isEmpty(value: string | number | null | undefined): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

export function DetailRow({
  label,
  value,
  type = "text",
  badgeType,
  className,
}: DetailRowProps) {
  const empty = isEmpty(value);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {empty ? (
        <span className="text-sm text-muted-foreground">-</span>
      ) : type === "badge" && badgeType ? (
        <div>
          <StatusBadge type={badgeType} value={String(value)} />
        </div>
      ) : type === "date" ? (
        <span className="text-sm text-foreground">
          {formatDateWITA(String(value)) || "-"}
        </span>
      ) : type === "email" ? (
        <a
          href={`mailto:${value}`}
          className="text-sm text-primary hover:underline"
        >
          {String(value)}
        </a>
      ) : type === "phone" ? (
        <a
          href={`tel:${String(value).replace(/\s+/g, "")}`}
          className="text-sm text-primary hover:underline"
        >
          {String(value)}
        </a>
      ) : (
        <span className="text-sm text-foreground whitespace-pre-wrap break-words">
          {String(value)}
        </span>
      )}
    </div>
  );
}
