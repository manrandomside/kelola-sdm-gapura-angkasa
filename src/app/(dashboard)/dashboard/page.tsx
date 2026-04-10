"use client";

import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CheckCircle,
  Download,
  Plus,
  Upload,
  UserCheck,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { BarChartCard } from "@/components/dashboard/bar-chart-card";
import { DonutChartCard } from "@/components/dashboard/donut-chart";
import { RecentActivitiesCard } from "@/components/dashboard/recent-activities";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="flex items-center gap-4 rounded-xl border border-border bg-white p-5">
      <Skeleton className="size-12 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  );
}

function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-2 h-3 w-32" />
      <Skeleton className="mt-4 w-full" style={{ height }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const statsQuery = useDashboardStats();
  const chartsQuery = useDashboardCharts();
  const activitiesQuery = useDashboardActivities();

  const canEdit = user?.role === "super_admin" || user?.role === "admin";

  // Format tanggal hari ini dalam WITA. Pakai Intl di locale Indonesia via
  // date-fns untuk nama hari & bulan.
  const todayLabel = useMemo(() => {
    // Convert current time to WITA via Intl formatter, lalu parse kembali.
    // Cara sederhana: ambil komponen hari/bulan/tahun dengan formatter WITA.
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
    const wita = new Date(y, m, d);
    return format(wita, "EEEE, d MMMM yyyy", { locale: idLocale });
  }, []);

  const stats = statsQuery.data;
  const charts = chartsQuery.data;
  const activities = activitiesQuery.data?.activities ?? [];

  const statsLoading = statsQuery.isLoading;
  const chartsLoading = chartsQuery.isLoading;
  const activitiesLoading = activitiesQuery.isLoading;

  return (
    <div className="space-y-6">
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
            render={<Link href={ROUTES.EXPORT} />}
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
              title="Total Karyawan"
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
              />
              <StatCard
                title="Paket Pekerjaan"
                value={stats.tadPaketPekerjaan}
                icon={UserCog}
                color="pink"
                compact
              />
            </>
          )}
        </div>
      </div>

      {/* Row 3: Donut + Unit Organisasi Bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {chartsLoading || !charts ? (
          <>
            <ChartSkeleton height={280} />
            <ChartSkeleton height={320} />
          </>
        ) : (
          <>
            <DonutChartCard
              title="Distribusi Status Kontrak"
              data={charts.statusKontrak}
            />
            <BarChartCard
              title="Karyawan per Unit Organisasi"
              data={charts.unitOrganisasi}
              layout="vertical"
              height={320}
            />
          </>
        )}
      </div>

      {/* Row 4: Provider Bar + Recent Activities */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {chartsLoading || !charts ? (
          <ChartSkeleton height={360} />
        ) : (
          <BarChartCard
            title="Karyawan per Provider"
            data={charts.provider}
            layout="vertical"
            height={360}
          />
        )}
        <RecentActivitiesCard
          activities={activities}
          isLoading={activitiesLoading}
        />
      </div>

      {/* Error states */}
      {(statsQuery.isError || chartsQuery.isError || activitiesQuery.isError) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Gagal memuat sebagian data dashboard. Silakan refresh halaman.
        </div>
      )}
    </div>
  );
}
