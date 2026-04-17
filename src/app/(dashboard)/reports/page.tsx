"use client";

import { FileDown, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/utils/toast";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { PROVIDER_OPTIONS } from "@/lib/constants/enums";
import {
  generateMonthlyReport,
  generateProviderReport,
  generateContractReport,
} from "@/lib/utils/pdf-reports";

import type { ApiResponse } from "@/types/api";

// ============================================================================
// Helpers
// ============================================================================

const MONTH_OPTIONS = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const YEAR_OPTIONS = ["2024", "2025", "2026"];

const DAYS_OPTIONS = [
  { value: "30", label: "30 Hari" },
  { value: "60", label: "60 Hari" },
  { value: "90", label: "90 Hari" },
];

async function fetchReportData<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

// ============================================================================
// Report Card Component
// ============================================================================

interface ReportCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onGenerate: () => void;
  isLoading: boolean;
}

function ReportCard({
  title,
  description,
  children,
  onGenerate,
  isLoading,
}: ReportCardProps) {
  return (
    <div className="glass-card-subtle rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {children}
        <Button
          onClick={onGenerate}
          disabled={isLoading}
          className="gap-1.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Menggenerate...
            </>
          ) : (
            <>
              <FileDown className="size-4" />
              Generate PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ReportsPage() {
  const { user } = useAuth();
  const now = new Date();

  const isProviderScoped =
    user?.provider !== null &&
    user?.provider !== undefined &&
    user?.provider !== "PT Gapura Angkasa";

  // Monthly report state
  const [monthlyMonth, setMonthlyMonth] = useState(String(now.getMonth() + 1));
  const [monthlyYear, setMonthlyYear] = useState(String(now.getFullYear()));
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Provider report state
  const [providerName, setProviderName] = useState(
    isProviderScoped && user?.provider ? user.provider : PROVIDER_OPTIONS[0],
  );
  const [providerLoading, setProviderLoading] = useState(false);

  // Contract report state
  const [contractDays, setContractDays] = useState("90");
  const [contractLoading, setContractLoading] = useState(false);

  async function handleMonthlyReport() {
    setMonthlyLoading(true);
    try {
      const data = await fetchReportData(
        `/api/reports/monthly?month=${monthlyMonth}&year=${monthlyYear}`,
      );
      await generateMonthlyReport(data as Parameters<typeof generateMonthlyReport>[0]);
      toast.success("Laporan bulanan berhasil di-download");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal generate laporan",
      );
    } finally {
      setMonthlyLoading(false);
    }
  }

  async function handleProviderReport() {
    setProviderLoading(true);
    try {
      const data = await fetchReportData(
        `/api/reports/provider?provider=${encodeURIComponent(providerName)}`,
      );
      await generateProviderReport(data as Parameters<typeof generateProviderReport>[0]);
      toast.success("Laporan provider berhasil di-download");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal generate laporan",
      );
    } finally {
      setProviderLoading(false);
    }
  }

  async function handleContractReport() {
    setContractLoading(true);
    try {
      const data = await fetchReportData(
        `/api/reports/contract?days=${contractDays}`,
      );
      await generateContractReport(data as Parameters<typeof generateContractReport>[0]);
      toast.success("Laporan kontrak berhasil di-download");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal generate laporan",
      );
    } finally {
      setContractLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
          <FileText className="size-7 text-primary" />
          Laporan
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate laporan PDF profesional untuk kebutuhan manajemen.
        </p>
      </div>

      {/* Monthly Report */}
      <ReportCard
        title="Laporan Bulanan SDM"
        description="Ringkasan data SDM per bulan termasuk distribusi per unit dan provider."
        onGenerate={handleMonthlyReport}
        isLoading={monthlyLoading}
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Bulan</Label>
          <Select
            value={monthlyMonth}
            onValueChange={(v) => { if (v) setMonthlyMonth(v); }}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tahun</Label>
          <Select
            value={monthlyYear}
            onValueChange={(v) => { if (v) setMonthlyYear(v); }}
          >
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportCard>

      {/* Provider Report */}
      <ReportCard
        title="Laporan Per Provider"
        description="Data SDM spesifik per provider untuk dikirim ke pihak provider."
        onGenerate={handleProviderReport}
        isLoading={providerLoading}
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Provider</Label>
          <Select
            value={providerName}
            onValueChange={(v) => { if (v) setProviderName(v); }}
            disabled={isProviderScoped}
          >
            <SelectTrigger className="h-9 w-full sm:w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportCard>

      {/* Contract Report */}
      <ReportCard
        title="Laporan Kontrak"
        description="Daftar kontrak karyawan yang akan berakhir dalam periode tertentu."
        onGenerate={handleContractReport}
        isLoading={contractLoading}
      >
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Rentang</Label>
          <Select
            value={contractDays}
            onValueChange={(v) => { if (v) setContractDays(v); }}
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportCard>
    </div>
  );
}
