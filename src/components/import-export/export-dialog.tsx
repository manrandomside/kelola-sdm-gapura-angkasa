"use client";

import { Download, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEmployees } from "@/hooks/use-employees";
import {
  useExportExcel,
  type ExportColumnSet,
  type ExportFilter,
} from "@/hooks/use-export";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Filter yang sedang aktif di halaman pemanggil (opsional). Jika tidak
  // disediakan, hanya opsi "Semua Karyawan" yang tersedia.
  activeFilter?: ExportFilter;
  activeFilterCount?: number;
}

type ScopeMode = "all" | "filtered";

export function ExportDialog({
  open,
  onOpenChange,
  activeFilter,
  activeFilterCount = 0,
}: ExportDialogProps) {
  const hasFilter = activeFilterCount > 0;

  const [scope, setScope] = useState<ScopeMode>("all");
  const [columns, setColumns] = useState<ExportColumnSet>("all");

  const exportMutation = useExportExcel();

  // Fetch count untuk preview — pakai limit=1 agar pagination.total tersedia
  // tanpa mengambil data lengkap.
  const previewQuery = useEmployees({
    page: 1,
    limit: 1,
    search: scope === "filtered" ? activeFilter?.search ?? "" : "",
    status_pegawai:
      scope === "filtered" ? activeFilter?.status_pegawai ?? null : null,
    status_kontrak:
      scope === "filtered" ? activeFilter?.status_kontrak ?? null : null,
    unit_organisasi:
      scope === "filtered" ? activeFilter?.unit_organisasi ?? null : null,
    provider: scope === "filtered" ? activeFilter?.provider ?? null : null,
    status_kerja:
      scope === "filtered" ? activeFilter?.status_kerja ?? null : null,
    sort: "nama_lengkap",
    order: "asc",
  });

  const totalCount = previewQuery.data?.pagination.total ?? 0;

  const effectiveFilter = useMemo<ExportFilter | undefined>(() => {
    if (scope === "all") return undefined;
    return activeFilter;
  }, [scope, activeFilter]);

  const handleExport = () => {
    exportMutation.mutate(
      {
        filter: effectiveFilter,
        columns,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data Karyawan</DialogTitle>
          <DialogDescription>
            Pilih data dan kolom yang ingin di-export ke file Excel (.xlsx).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Opsi data */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Data yang di-export</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as ScopeMode)}
              className="gap-2"
            >
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/40">
                <RadioGroupItem value="all" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Semua Karyawan</p>
                  <p className="text-xs text-muted-foreground">
                    Export seluruh data karyawan aktif tanpa filter.
                  </p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 rounded-lg border border-border p-3 ${
                  hasFilter
                    ? "cursor-pointer hover:bg-muted/40"
                    : "cursor-not-allowed opacity-50"
                }`}
              >
                <RadioGroupItem value="filtered" disabled={!hasFilter} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Sesuai Filter Aktif</p>
                  <p className="text-xs text-muted-foreground">
                    {hasFilter
                      ? `Gunakan ${activeFilterCount} filter yang sedang diterapkan.`
                      : "Tidak ada filter yang sedang aktif."}
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Opsi kolom */}
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
            <span className="text-muted-foreground">Total:</span>{" "}
            <span className="font-semibold text-primary">
              {totalCount.toLocaleString("id-ID")} karyawan
            </span>{" "}
            <span className="text-muted-foreground">akan di-export</span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={exportMutation.isPending} />}
          >
            Batal
          </DialogClose>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending || totalCount === 0}
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
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
