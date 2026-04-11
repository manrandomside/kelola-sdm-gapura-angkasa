"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getContractInfo, type ContractStatus } from "@/lib/utils/contract";

// ============================================================================
// Types
// ============================================================================
interface ContractBadgeProps {
  tmtBerakhirKerja: string | Date | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
}

// ============================================================================
// Icon map
// ============================================================================
const STATUS_ICON: Record<ContractStatus, React.ElementType> = {
  safe: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
  expired: XCircle,
  no_contract: XCircle,
};

// ============================================================================
// Component
// ============================================================================
export function ContractBadge({
  tmtBerakhirKerja,
  size = "md",
  showLabel = true,
}: ContractBadgeProps) {
  const info = getContractInfo(tmtBerakhirKerja);

  if (info.status === "no_contract") {
    return null;
  }

  const Icon = STATUS_ICON[info.status];
  const isSmall = size === "sm";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium",
        info.color,
        info.bgColor,
        info.borderColor,
        isSmall ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
      )}
      title={info.label}
    >
      <Icon className={cn("shrink-0", isSmall ? "size-3" : "size-3.5")} />
      {showLabel && <span>{info.label}</span>}
    </span>
  );
}
