import { cn } from "@/lib/utils";

type BadgeType = "status_kerja" | "status_pegawai" | "status_kontrak";

const STATUS_KERJA_STYLES: Record<string, string> = {
  Aktif: "bg-green-100 text-green-700",
  "Non Aktif": "bg-red-100 text-red-700",
  Pensiun: "bg-gray-100 text-gray-700",
  Mutasi: "bg-amber-100 text-amber-700",
};

const STATUS_PEGAWAI_STYLES: Record<string, string> = {
  "PEGAWAI TETAP": "bg-blue-100 text-blue-700",
  TAD: "bg-violet-100 text-violet-700",
};

const STATUS_KONTRAK_STYLES: Record<string, string> = {
  "PEGAWAI TETAP": "bg-blue-100 text-blue-700",
  PKWT: "bg-violet-100 text-violet-700",
  "PAKET SDM": "bg-orange-100 text-orange-700",
  "PAKET PEKERJAAN": "bg-pink-100 text-pink-700",
};

const STYLE_MAP: Record<BadgeType, Record<string, string>> = {
  status_kerja: STATUS_KERJA_STYLES,
  status_pegawai: STATUS_PEGAWAI_STYLES,
  status_kontrak: STATUS_KONTRAK_STYLES,
};

interface StatusBadgeProps {
  type: BadgeType;
  value: string | null | undefined;
  className?: string;
}

export function StatusBadge({ type, value, className }: StatusBadgeProps) {
  if (!value) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500",
          className,
        )}
      >
        -
      </span>
    );
  }

  const styles = STYLE_MAP[type][value] ?? "bg-gray-100 text-gray-700";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        styles,
        className,
      )}
    >
      {value}
    </span>
  );
}
