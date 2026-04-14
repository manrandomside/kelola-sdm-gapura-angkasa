"use client";

import { ArrowLeft, ChevronDown, ChevronRight, FileWarning, Clock, UserX, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNonAktifDetail } from "@/hooks/use-non-aktif-detail";
import type { NonAktifEmployee } from "@/hooks/use-non-aktif-detail";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

// ============================================================================
// Section Component
// ============================================================================
interface SectionProps {
  title: string;
  description: string;
  count: number;
  employees: NonAktifEmployee[];
  icon: React.ElementType;
  iconColor: string;
  badgeColor: string;
  columns: ColumnConfig[];
  defaultExpanded?: boolean;
}

interface ColumnConfig {
  key: string;
  label: string;
  render: (emp: NonAktifEmployee, idx: number) => React.ReactNode;
}

function Section({
  title,
  description,
  count,
  employees,
  icon: Icon,
  iconColor,
  badgeColor,
  columns,
  defaultExpanded = true,
}: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", iconColor)}>
          <Icon className="size-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", badgeColor)}>
              {count.toLocaleString("id-ID")} karyawan
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {expanded ? (
          <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {employees.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">Tidak ada karyawan dalam kategori ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      className={cn(
                        "border-b border-border transition-colors hover:bg-muted/30 cursor-pointer",
                        idx % 2 === 1 && "bg-muted/20",
                      )}
                      onClick={() => router.push(ROUTES.EMPLOYEES_DETAIL(emp.id))}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="whitespace-nowrap px-4 py-2.5">
                          {col.render(emp, idx)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">-</span>;
  const styles: Record<string, string> = {
    Aktif: "bg-green-50 text-green-700",
    "Non Aktif": "bg-red-50 text-red-700",
    Pensiun: "bg-gray-100 text-gray-700",
    Mutasi: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", styles[status] ?? "bg-gray-100 text-gray-700")}>
      {status}
    </span>
  );
}

const BASE_COLUMNS: ColumnConfig[] = [
  { key: "no", label: "No", render: (_emp, idx) => <span className="text-muted-foreground">{idx + 1}</span> },
  { key: "nama", label: "Nama", render: (emp) => <span className="font-medium text-foreground">{emp.namaLengkap}</span> },
  { key: "nip", label: "NIP", render: (emp) => <span className="font-mono text-xs text-muted-foreground">{emp.nip}</span> },
  { key: "jabatan", label: "Jabatan", render: (emp) => emp.namaJabatan ?? <span className="text-muted-foreground">-</span> },
  { key: "unit", label: "Unit", render: (emp) => emp.unitOrganisasi ?? <span className="text-muted-foreground">-</span> },
  { key: "provider", label: "Provider", render: (emp) => emp.provider ?? <span className="text-muted-foreground">-</span> },
];

const KONTRAK_HABIS_COLUMNS: ColumnConfig[] = [
  ...BASE_COLUMNS,
  { key: "tmtBerakhir", label: "TMT Berakhir", render: (emp) => formatDate(emp.tmtBerakhirKerja) },
  { key: "status", label: "Status", render: (emp) => <StatusBadge status={emp.statusKerja} /> },
];

const PENSIUN_COLUMNS: ColumnConfig[] = [
  ...BASE_COLUMNS,
  { key: "tmtPensiun", label: "TMT Pensiun", render: (emp) => formatDate(emp.tmtPensiun) },
  { key: "status", label: "Status", render: (emp) => <StatusBadge status={emp.statusKerja} /> },
];

const NON_AKTIF_MANUAL_COLUMNS: ColumnConfig[] = [
  ...BASE_COLUMNS,
  { key: "status", label: "Status", render: (emp) => <StatusBadge status={emp.statusKerja} /> },
];

// ============================================================================
// Page
// ============================================================================
export default function NonAktifDetailPage() {
  const { data, isLoading, isError, error } = useNonAktifDetail();

  if (isLoading) {
    return <NonAktifSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader total={0} />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Gagal memuat data: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader total={data.totalNonAktif} />

      {/* Total stat */}
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-red-500">
          <Users className="size-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-red-600">Total Non Aktif</p>
          <p className="text-2xl font-bold tabular-nums text-red-700">
            {data.totalNonAktif.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      {/* Sections */}
      <Section
        title="Kontrak Habis"
        description="TMT Berakhir Kerja sudah melewati tanggal hari ini."
        count={data.kontrakHabis.count}
        employees={data.kontrakHabis.employees}
        icon={Clock}
        iconColor="bg-amber-500"
        badgeColor="bg-amber-100 text-amber-700"
        columns={KONTRAK_HABIS_COLUMNS}
      />

      <Section
        title="Pensiun"
        description="Karyawan yang sudah memasuki masa pensiun."
        count={data.pensiun.count}
        employees={data.pensiun.employees}
        icon={FileWarning}
        iconColor="bg-gray-500"
        badgeColor="bg-gray-100 text-gray-700"
        columns={PENSIUN_COLUMNS}
      />

      <Section
        title="Non Aktif Manual"
        description="Karyawan yang di-set non-aktif secara manual oleh admin."
        count={data.nonAktifManual.count}
        employees={data.nonAktifManual.employees}
        icon={UserX}
        iconColor="bg-red-500"
        badgeColor="bg-red-100 text-red-700"
        columns={NON_AKTIF_MANUAL_COLUMNS}
      />
    </div>
  );
}

// ============================================================================
// Header
// ============================================================================
function PageHeader({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Karyawan Non Aktif
        </h1>
        <p className="text-sm text-muted-foreground">
          Detail breakdown karyawan yang tidak aktif berdasarkan alasan
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        render={<Link href={ROUTES.EMPLOYEES} />}
      >
        <ArrowLeft className="size-4" />
        Kembali ke Daftar Karyawan
      </Button>
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================
function NonAktifSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
