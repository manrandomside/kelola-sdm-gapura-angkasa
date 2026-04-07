"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROVIDER_OPTIONS,
  STATUS_KERJA_OPTIONS,
  STATUS_KONTRAK_OPTIONS,
  STATUS_PEGAWAI_OPTIONS,
  UNIT_ORGANISASI_OPTIONS,
} from "@/lib/constants/enums";

import type { FilterKey } from "@/stores/filter-store";

interface FilterBarProps {
  status_pegawai: string | null;
  status_kontrak: string | null;
  unit_organisasi: string | null;
  provider: string | null;
  status_kerja: string | null;
  onChange: (key: FilterKey, value: string | null) => void;
  onClear: () => void;
  activeCount: number;
}

const ALL_VALUE = "__ALL__";

interface FilterSelectProps {
  label: string;
  value: string | null;
  options: readonly string[];
  onChange: (value: string | null) => void;
  minWidth?: string;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  minWidth = "min-w-[160px]",
}: FilterSelectProps) {
  return (
    <Select
      value={value ?? ALL_VALUE}
      onValueChange={(next) => {
        const asString = next as string;
        onChange(asString === ALL_VALUE ? null : asString);
      }}
    >
      <SelectTrigger className={`h-10 ${minWidth}`}>
        <SelectValue>
          {(current: string) =>
            current === ALL_VALUE ? (
              <span className="text-muted-foreground">{label}</span>
            ) : (
              <span>{current}</span>
            )
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>
          <span className="text-muted-foreground">Semua {label}</span>
        </SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FilterBar({
  status_pegawai,
  status_kontrak,
  unit_organisasi,
  provider,
  status_kerja,
  onChange,
  onClear,
  activeCount,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        label="Status Pegawai"
        value={status_pegawai}
        options={STATUS_PEGAWAI_OPTIONS}
        onChange={(v) => onChange("status_pegawai", v)}
        minWidth="min-w-[170px]"
      />
      <FilterSelect
        label="Status Kontrak"
        value={status_kontrak}
        options={STATUS_KONTRAK_OPTIONS}
        onChange={(v) => onChange("status_kontrak", v)}
        minWidth="min-w-[170px]"
      />
      <FilterSelect
        label="Unit Organisasi"
        value={unit_organisasi}
        options={UNIT_ORGANISASI_OPTIONS}
        onChange={(v) => onChange("unit_organisasi", v)}
        minWidth="min-w-[170px]"
      />
      <FilterSelect
        label="Provider"
        value={provider}
        options={PROVIDER_OPTIONS}
        onChange={(v) => onChange("provider", v)}
        minWidth="min-w-[200px]"
      />
      <FilterSelect
        label="Status Kerja"
        value={status_kerja}
        options={STATUS_KERJA_OPTIONS}
        onChange={(v) => onChange("status_kerja", v)}
        minWidth="min-w-[150px]"
      />

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-10 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
          Reset Filter
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
            {activeCount}
          </span>
        </Button>
      )}
    </div>
  );
}
