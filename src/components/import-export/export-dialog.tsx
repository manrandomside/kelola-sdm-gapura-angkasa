"use client";

import { Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useExportExcel,
  useExportPreview,
  type CustomExportFilters,
  type ExportColumnSet,
  type ExportFilter,
} from "@/hooks/use-export";
import {
  PROVIDER_OPTIONS,
  STATUS_KERJA_OPTIONS,
  STATUS_PEGAWAI_OPTIONS,
  UNIT_ORGANISASI_OPTIONS,
} from "@/lib/constants/enums";

const ALL_VALUE = "__ALL__";

type ExportMode = "all" | "selected" | "custom";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<number>;
  currentFilters: ExportFilter;
  userProvider: string | null;
  onExportSuccess?: () => void;
}

export function ExportDialog({
  open,
  onOpenChange,
  selectedIds,
  currentFilters,
  userProvider,
  onExportSuccess,
}: ExportDialogProps) {
  const hasSelection = selectedIds.size > 0;
  const isProviderScoped =
    userProvider !== null &&
    userProvider !== "PT Gapura Angkasa";

  const [mode, setMode] = useState<ExportMode>(hasSelection ? "selected" : "all");
  const [columns, setColumns] = useState<ExportColumnSet>("all");

  // Custom filter state
  const [customStatusKerja, setCustomStatusKerja] = useState<string>("");
  const [customStatusPegawai, setCustomStatusPegawai] = useState<string>("");
  const [customProvider, setCustomProvider] = useState<string>(
    isProviderScoped ? userProvider : "",
  );
  const [customUnitOrganisasi, setCustomUnitOrganisasi] = useState<string>("");
  const [customTmtFrom, setCustomTmtFrom] = useState<string>("");
  const [customTmtTo, setCustomTmtTo] = useState<string>("");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode(hasSelection ? "selected" : "all");
      setColumns("all");
      setCustomStatusKerja("");
      setCustomStatusPegawai("");
      setCustomProvider(isProviderScoped ? userProvider : "");
      setCustomUnitOrganisasi("");
      setCustomTmtFrom("");
      setCustomTmtTo("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const exportMutation = useExportExcel();
  const previewMutation = useExportPreview();

  const customFilters = useMemo<CustomExportFilters>(() => {
    const f: CustomExportFilters = {};
    if (customStatusKerja) f.statusKerja = customStatusKerja;
    if (customStatusPegawai) f.statusPegawai = customStatusPegawai;
    if (customProvider) f.provider = customProvider;
    if (customUnitOrganisasi) f.unitOrganisasi = customUnitOrganisasi;
    if (customTmtFrom) f.tmtBerakhirFrom = customTmtFrom;
    if (customTmtTo) f.tmtBerakhirTo = customTmtTo;
    return f;
  }, [
    customStatusKerja,
    customStatusPegawai,
    customProvider,
    customUnitOrganisasi,
    customTmtFrom,
    customTmtTo,
  ]);

  // Debounced preview count
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPreview = useCallback(() => {
    if (mode === "selected") {
      // No API call needed for selected mode
      return;
    }

    const payload =
      mode === "custom"
        ? { mode: "custom" as const, filters: customFilters }
        : {
            mode: "all" as const,
            currentFilters: currentFilters,
          };

    previewMutation.mutate(payload);
  }, [mode, customFilters, currentFilters, previewMutation]);

  // Trigger preview on mode/filter change with debounce
  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      triggerPreview();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, customFilters, currentFilters]);

  const previewCount =
    mode === "selected"
      ? selectedIds.size
      : previewMutation.data?.count ?? 0;

  const isPreviewLoading = mode !== "selected" && previewMutation.isPending;

  const handleExport = () => {
    if (mode === "selected") {
      exportMutation.mutate(
        {
          selectedIds: Array.from(selectedIds),
          columns,
          mode: "selected",
        },
        { onSuccess: () => { onOpenChange(false); onExportSuccess?.(); } },
      );
    } else if (mode === "custom") {
      exportMutation.mutate(
        {
          columns,
          mode: "custom",
          customFilters,
        },
        { onSuccess: () => { onOpenChange(false); onExportSuccess?.(); } },
      );
    } else {
      exportMutation.mutate(
        {
          filter: currentFilters,
          columns,
          mode: "all",
        },
        { onSuccess: () => { onOpenChange(false); onExportSuccess?.(); } },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Data Karyawan</DialogTitle>
          <DialogDescription>
            Pilih mode export dan kolom yang ingin di-export ke file Excel
            (.xlsx).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Mode selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Pilih mode export</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as ExportMode)}
              className="gap-2"
            >
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/40">
                <RadioGroupItem value="all" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Export Semua</p>
                  <p className="text-xs text-muted-foreground">
                    Export seluruh data sesuai filter yang sedang aktif.
                  </p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 rounded-lg border border-border p-3 ${
                  hasSelection
                    ? "cursor-pointer hover:bg-muted/40"
                    : "cursor-not-allowed opacity-50"
                }`}
                title={
                  hasSelection
                    ? undefined
                    : "Centang karyawan di tabel terlebih dahulu"
                }
              >
                <RadioGroupItem value="selected" disabled={!hasSelection} />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Export Terpilih
                    {hasSelection && (
                      <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                        {selectedIds.size}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasSelection
                      ? `Export ${selectedIds.size} karyawan yang sudah dicentang.`
                      : "Centang karyawan di tabel terlebih dahulu."}
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/40">
                <RadioGroupItem value="custom" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Export Custom</p>
                  <p className="text-xs text-muted-foreground">
                    Tentukan filter sendiri untuk data yang di-export.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Custom filters — shown only in custom mode */}
          {mode === "custom" && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-semibold">
                Filter data yang ingin di-export
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Status Kerja */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Status Kerja
                  </Label>
                  <Select
                    value={customStatusKerja || ALL_VALUE}
                    onValueChange={(v) =>
                      setCustomStatusKerja(v === ALL_VALUE || v === null ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue>
                        {(val: string) =>
                          val === ALL_VALUE ? (
                            <span className="text-muted-foreground">Semua</span>
                          ) : (
                            <span>{val}</span>
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Semua</SelectItem>
                      {STATUS_KERJA_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Pegawai */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Status Pegawai
                  </Label>
                  <Select
                    value={customStatusPegawai || ALL_VALUE}
                    onValueChange={(v) =>
                      setCustomStatusPegawai(v === ALL_VALUE || v === null ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue>
                        {(val: string) =>
                          val === ALL_VALUE ? (
                            <span className="text-muted-foreground">Semua</span>
                          ) : (
                            <span>{val}</span>
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Semua</SelectItem>
                      {STATUS_PEGAWAI_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Provider */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Provider
                  </Label>
                  <Select
                    value={customProvider || ALL_VALUE}
                    onValueChange={(v) =>
                      setCustomProvider(v === ALL_VALUE || v === null ? "" : v)
                    }
                    disabled={isProviderScoped}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue>
                        {(val: string) =>
                          val === ALL_VALUE ? (
                            <span className="text-muted-foreground">Semua</span>
                          ) : (
                            <span className="truncate">{val}</span>
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Semua</SelectItem>
                      {PROVIDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit Organisasi */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Unit Organisasi
                  </Label>
                  <Select
                    value={customUnitOrganisasi || ALL_VALUE}
                    onValueChange={(v) =>
                      setCustomUnitOrganisasi(v === ALL_VALUE || v === null ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue>
                        {(val: string) =>
                          val === ALL_VALUE ? (
                            <span className="text-muted-foreground">Semua</span>
                          ) : (
                            <span>{val}</span>
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Semua</SelectItem>
                      {UNIT_ORGANISASI_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* TMT Berakhir Kerja date range */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  TMT Berakhir Kerja
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={customTmtFrom}
                    onChange={(e) => setCustomTmtFrom(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Dari"
                  />
                  <span className="text-xs text-muted-foreground">s/d</span>
                  <Input
                    type="date"
                    value={customTmtTo}
                    onChange={(e) => setCustomTmtTo(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Sampai"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Column selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Kolom yang di-export</Label>
            <RadioGroup
              value={columns}
              onValueChange={(v) => setColumns(v as ExportColumnSet)}
              className="gap-2"
            >
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/40">
                <RadioGroupItem value="all" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Semua Kolom (45 kolom)</p>
                  <p className="text-xs text-muted-foreground">
                    Lengkap sesuai format template import.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/40">
                <RadioGroupItem value="basic" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Kolom Dasar (15 kolom)</p>
                  <p className="text-xs text-muted-foreground">
                    Informasi ringkas: identitas, status, jabatan, dan kontak.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Preview count */}
          <div className="rounded-lg bg-primary/5 px-4 py-3 text-sm">
            {isPreviewLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Menghitung...
              </span>
            ) : (
              <>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-semibold text-primary">
                  {previewCount.toLocaleString("id-ID")} karyawan
                </span>{" "}
                <span className="text-muted-foreground">akan di-export</span>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={exportMutation.isPending} />
            }
          >
            Batal
          </DialogClose>
          <Button
            onClick={handleExport}
            disabled={
              exportMutation.isPending ||
              isPreviewLoading ||
              previewCount === 0
            }
            className="gap-1.5"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Mempersiapkan file...
              </>
            ) : (
              <>
                <Download className="size-4" />
                Export Excel (.xlsx)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
