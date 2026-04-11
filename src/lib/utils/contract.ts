import { differenceInDays, parseISO, isValid } from "date-fns";

import { APP_TIMEZONE } from "@/lib/utils/date";

// ============================================================================
// Types
// ============================================================================
export type ContractStatus = "safe" | "warning" | "danger" | "expired" | "no_contract";

export interface ContractInfo {
  status: ContractStatus;
  remainingDays: number | null;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ============================================================================
// Thresholds
// ============================================================================
const SAFE_THRESHOLD = 90;
const WARNING_THRESHOLD = 30;

// ============================================================================
// Helper: get today in WITA timezone as a Date (midnight local)
// ============================================================================
function getTodayWITA(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "month")?.value ?? 1) - 1;
  const d = Number(parts.find((p) => p.type === "day")?.value ?? 1);
  return new Date(y, m, d);
}

// ============================================================================
// Main function
// ============================================================================
export function getContractInfo(
  tmtBerakhirKerja: string | Date | null | undefined,
): ContractInfo {
  if (tmtBerakhirKerja == null) {
    return {
      status: "no_contract",
      remainingDays: null,
      label: "Tidak ada kontrak",
      color: "text-gray-400",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    };
  }

  const endDate =
    tmtBerakhirKerja instanceof Date
      ? tmtBerakhirKerja
      : parseISO(String(tmtBerakhirKerja));

  if (!isValid(endDate)) {
    return {
      status: "no_contract",
      remainingDays: null,
      label: "Tidak ada kontrak",
      color: "text-gray-400",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    };
  }

  const today = getTodayWITA();
  const remaining = differenceInDays(endDate, today);

  if (remaining < 0) {
    return {
      status: "expired",
      remainingDays: remaining,
      label: `Berakhir ${Math.abs(remaining)} hari lalu`,
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    };
  }

  if (remaining < WARNING_THRESHOLD) {
    return {
      status: "danger",
      remainingDays: remaining,
      label: `Sisa ${remaining} hari`,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    };
  }

  if (remaining <= SAFE_THRESHOLD) {
    return {
      status: "warning",
      remainingDays: remaining,
      label: `Sisa ${remaining} hari`,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    };
  }

  return {
    status: "safe",
    remainingDays: remaining,
    label: `Sisa ${remaining} hari`,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  };
}
