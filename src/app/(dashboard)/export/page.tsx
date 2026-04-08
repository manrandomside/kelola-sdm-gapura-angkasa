"use client";

import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEmployees } from "@/hooks/use-employees";
import {
  useExportExcel,
  type ExportColumnSet,
} from "@/hooks/use-export";

export default function ExportPage() {
  const [columns, setColumns] = useState<ExportColumnSet>("all");
  const exportMutation = useExportExcel();

  // Ambil total count (semua karyawan aktif) untuk preview.
  const countQuery = useEmployees({
    page: 1,
    limit: 1,
    search: "",
    status_pegawai: null,
    status_kontrak: null,
    unit_organisasi: null,
    provider: null,
    status_kerja: null,
    sort: "nama_lengkap",
    order: "asc",
  });

  const totalCount = countQuery.data?.pagination.total ?? 0;

  const handleExport = () => {
    exportMutation.mutate({
      columns,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
          <FileSpreadsheet className="size-7 text-primary" />
          Export Data Karyawan
        </h1>
        <p className="text-sm text-muted-foreground">
          Export data karyawan ke file Excel (.xlsx) untuk keperluan laporan
          dan administrasi.
        </p>
      </div>

      {/* Card opsi */}
      <div className="max-w-2xl space-y-5 rounded-xl border border-border bg-white p-6">
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

        <div className="rounded-lg bg-primary/5 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Total:</span>{" "}
          <span className="font-semibold text-primary">
            {totalCount.toLocaleString("id-ID")} karyawan
          </span>{" "}
          <span className="text-muted-foreground">akan di-export</span>
        </div>

        <Button
          onClick={handleExport}
          disabled={exportMutation.isPending || totalCount === 0}
          size="lg"
          className="w-full gap-1.5"
        >
          {exportMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Mempersiapkan file...
            </>
          ) : (
            <>
              <Download className="size-4" />
              Export Excel
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          File akan otomatis terdownload setelah proses selesai.
        </p>
      </div>
    </div>
  );
}
