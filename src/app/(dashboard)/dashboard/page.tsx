"use client";

import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle,
  Download,
  HelpCircle,
  Plus,
  Upload,
  UserCheck,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AgeChart } from "@/components/dashboard/age-chart";
import { BarChartCard } from "@/components/dashboard/bar-chart-card";
import { StatusKontrakChart } from "@/components/dashboard/status-kontrak-chart";
import { GenderChart } from "@/components/dashboard/gender-chart";
import { PositionGroupChart } from "@/components/dashboard/position-group-chart";
import { RecentActivitiesCard } from "@/components/dashboard/recent-activities";
import { RekapSummaryCard } from "@/components/dashboard/rekap-summary";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusOrgChart } from "@/components/dashboard/status-org-chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import {
  useDashboardActivities,
  useDashboardCharts,
  useDashboardStats,
} from "@/hooks/use-dashboard";
import { ROUTES } from "@/lib/constants/routes";
import { APP_TIMEZONE } from "@/lib/utils/date";

function StatCardSkeleton() {
  return (
    <div className="glass-card flex items-center gap-4 rounded-2xl p-5">
      <Skeleton className="size-12 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  );
}

// Per-bar color palettes for charts that need colorful bars.
const UNIT_ORG_COLORS: Record<string, string> = {
  Landside: "#3B82F6",
  Airside: "#22C55E",
  GSE: "#F59E0B",
  Ancillary: "#8B5CF6",
  "Back Office": "#EC4899",
  Avsec: "#06B6D4",
  EGM: "#F97316",
  GM: "#6366F1",
  GH: "#14B8A6",
};

const PROVIDER_COLORS: Record<string, string> = {
  "PT Air Box Personalia": "#3B82F6",
  "PT Finfleet Teknologi Indonesia": "#22C55E",
  "PT Gapura Angkasa": "#F59E0B",
  "PT Mandala Garda Nusantara": "#8B5CF6",
  "PT Mitra Angkasa Perdana": "#EC4899",
  "PT IAS Support": "#06B6D4",
  "PT Kidora Mandiri Investama": "#F97316",
  "PT Duta Griya Sarana": "#6366F1",
  "PT Graha Humanindo Manajemen": "#14B8A6",
  "PT Aerotrans Wisata": "#EF4444",
};

const COLORFUL_FALLBACK = "#9CA3AF";

function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div className="glass-card-subtle rounded-2xl p-5">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-2 h-3 w-32" />
      <Skeleton className="mt-4 w-full" style={{ height }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const statsQuery = useDashboardStats();
  const chartsQuery = useDashboardCharts();
  const activitiesQuery = useDashboardActivities();

  const canEdit = user?.role === "super_admin" || user?.role === "admin";

  // Real-time clock in WITA
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const todayLabel = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const y = Number(parts.find((p) => p.type === "year")?.value ?? 0);
    const m = Number(parts.find((p) => p.type === "month")?.value ?? 1) - 1;
    const d = Number(parts.find((p) => p.type === "day")?.value ?? 1);
    const wita = new Date(y, m, d);
    const dateStr = format(wita, "EEEE, d MMMM yyyy", { locale: idLocale });

    const timeParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: APP_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hh = timeParts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = timeParts.find((p) => p.type === "minute")?.value ?? "00";
    const ss = timeParts.find((p) => p.type === "second")?.value ?? "00";

    return `${dateStr} ${hh}:${mm}:${ss}`;
  }, [now]);

  const stats = statsQuery.data;
  const charts = chartsQuery.data;
  const activities = activitiesQuery.data?.activities ?? [];

  const statsLoading = statsQuery.isLoading;
  const chartsLoading = chartsQuery.isLoading;
  const activitiesLoading = activitiesQuery.isLoading;

  return (
    <div className="space-y-6 rounded-xl bg-gradient-to-b from-[#e8f5e9]/30 via-transparent to-transparent -mx-4 -mt-6 px-4 pt-6 sm:-mx-6 sm:-mt-8 sm:px-6 sm:pt-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Selamat datang, {user?.full_name ?? "Pengguna"}!
          </h1>
          <p className="text-sm text-muted-foreground">
            {todayLabel} WITA
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                render={<Link href={ROUTES.EMPLOYEES_CREATE} />}
              >
                <Plus className="size-4" />
                Tambah Karyawan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                render={<Link href={ROUTES.IMPORT} />}
              >
                <Upload className="size-4" />
                Import Excel
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            render={<Link href={ROUTES.EMPLOYEES} />}
          >
            <Download className="size-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Row 1: Main stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {statsLoading || !stats ? (
          Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={`s1-${i}`} />
          ))
        ) : (
          <>
            <StatCard
              title="Total"
              value={stats.total}
              icon={Users}
              color="primary"
            />
            <StatCard
              title="Pegawai Tetap"
              value={stats.pegawaiTetap}
              icon={UserCheck}
              color="blue"
            />
            <StatCard
              title="PKWT"
              value={stats.pkwt}
              icon={UserCog}
              color="violet"
            />
            <StatCard
              title="TAD"
              value={stats.tad}
              icon={UserCog}
              color="orange"
            />
            <StatCard
              title="Aktif"
              value={stats.aktif}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="Non Aktif"
              value={stats.nonAktif}
              icon={XCircle}
              color="red"
              description={
                stats.total > 0
                  ? `${((stats.nonAktif / stats.total) * 100).toFixed(1)}% dari total`
                  : undefined
              }
              onClick={() => router.push(ROUTES.EMPLOYEES_NON_AKTIF)}
            />
          </>
        )}
      </div>

      {/* Row 2: TAD breakdown (Paket SDM + Paket Pekerjaan only) */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Breakdown TAD
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {statsLoading || !stats ? (
            Array.from({ length: 2 }).map((_, i) => (
              <StatCardSkeleton key={`s2-${i}`} />
            ))
          ) : (
            <>
              <StatCard
                title="Paket SDM"
                value={stats.tadPaketSdm}
                icon={UserCog}
                color="amber"
                compact
                titleSuffix={
                  <TooltipProvider delay={200}>
                    <Tooltip>
                      <TooltipTrigger className="inline-flex">
                        <HelpCircle className="size-3.5 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Karyawan TAD yang dikontrak melalui paket SDM</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                }
              />
              <StatCard
                title="Paket Pekerjaan"
                value={stats.tadPaketPekerjaan}
                icon={UserCog}
                color="pink"
                compact
                titleSuffix={
                  <TooltipProvider delay={200}>
                    <Tooltip>
                      <TooltipTrigger className="inline-flex">
                        <HelpCircle className="size-3.5 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Karyawan TAD yang dikontrak melalui paket pekerjaan</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Row 3: Kontrak Segera Berakhir warning card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {statsLoading || !stats ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="SDM Kontrak Segera Berakhir"
            value={stats.kontrakAkanBerakhir}
            icon={AlertTriangle}
            color="amber"
            compact
            description={`${stats.kontrakAkanBerakhir.toLocaleString("id-ID")} karyawan dalam 90 hari ke depan`}
          />
        )}
      </div>

      {/* Chart Row 1: Status Kontrak Bar + Jenis Kelamin Donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {chartsLoading || !charts ? (
          <>
            <ChartSkeleton height={280} />
            <ChartSkeleton height={280} />
          </>
        ) : (
          <>
            <StatusKontrakChart data={charts.statusKontrak} />
            <GenderChart data={charts.jenisKelamin} />
          </>
        )}
      </div>

      {/* Chart Row 2: Unit Organisasi Bar + Komposisi Usia Bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {chartsLoading || !charts ? (
          <>
            <ChartSkeleton height={320} />
            <ChartSkeleton height={300} />
          </>
        ) : (
          <>
            <BarChartCard
              title="Karyawan per Unit Organisasi"
              data={charts.unitOrganisasi}
              colors={charts.unitOrganisasi.map(
                (d) => UNIT_ORG_COLORS[d.name] ?? COLORFUL_FALLBACK,
              )}
              layout="vertical"
              height={320}
            />
            <AgeChart data={charts.komposisiUsia} />
          </>
        )}
      </div>

      {/* Chart Row 3: Provider Bar + Kelompok Jabatan Bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {chartsLoading || !charts ? (
          <>
            <ChartSkeleton height={360} />
            <ChartSkeleton height={320} />
          </>
        ) : (
          <>
            <BarChartCard
              title="Karyawan per Provider"
              data={charts.provider}
              colors={charts.provider.map(
                (d) => PROVIDER_COLORS[d.name] ?? COLORFUL_FALLBACK,
              )}
              layout="vertical"
              height={360}
            />
            <PositionGroupChart data={charts.kelompokJabatan} />
          </>
        )}
      </div>

      {/* Chart Row 4: Stacked Bar — Status per Organisasi (full width) */}
      {chartsLoading || !charts ? (
        <ChartSkeleton height={320} />
      ) : (
        <StatusOrgChart data={charts.statusPerOrganisasi} />
      )}

      {/* Rekap SDM per Jabatan (Top 10) */}
      <RekapSummaryCard />

      {/* Recent Activities */}
      <RecentActivitiesCard
        activities={activities}
        isLoading={activitiesLoading}
      />

      {/* Error states */}
      {(statsQuery.isError || chartsQuery.isError || activitiesQuery.isError) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Gagal memuat sebagian data dashboard. Silakan refresh halaman.
        </div>
      )}
    </div>
  );
}
