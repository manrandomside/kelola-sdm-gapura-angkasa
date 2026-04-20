"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Info,
  Plus,
  ShieldCheck,
  UserCheck,
  UserX,
  Users2,
} from "lucide-react";

import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { EditRoleDialog } from "@/components/users/edit-role-dialog";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { UserTable } from "@/components/users/user-table";
import { useAuth } from "@/hooks/use-auth";
import {
  useDeleteUser,
  useResetPassword,
  useUsers,
  type UserListItem,
} from "@/hooks/use-users";
import { USER_ROLE_OPTIONS } from "@/lib/constants/enums";
import { ROUTES } from "@/lib/constants/routes";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

import type { UserRole } from "@/lib/constants/enums";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

const ALL_VALUE = "__ALL__";
const PAGE_LIMIT = 20;

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentClass: string;
  isLoading: boolean;
}

function StatCard({
  label,
  value,
  icon,
  accentClass,
  isLoading,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold text-foreground">
              {value.toLocaleString("id-ID")}
            </p>
          )}
        </div>
        <div
          className={`flex size-10 items-center justify-center rounded-lg ${accentClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRoleTarget, setEditRoleTarget] = useState<UserListItem | null>(
    null,
  );
  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserListItem | null>(
    null,
  );

  const query = useUsers({
    page,
    limit: PAGE_LIMIT,
    search,
    role,
    status,
  });

  const resetMutation = useResetPassword();
  const deleteMutation = useDeleteUser();

  const users = query.data?.users ?? [];
  const pagination = query.data?.pagination ?? {
    page,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  };
  const statistics = query.data?.statistics ?? {
    total: 0,
    active: 0,
    inactive: 0,
    superAdmin: 0,
    admin: 0,
    staff: 0,
  };

  const isLoading = query.isLoading || query.isFetching;

  const canAccess = useMemo(() => {
    if (isAuthLoading) return null;
    if (!currentUser) return false;
    return currentUser.role === "super_admin";
  }, [currentUser, isAuthLoading]);

  // Provider-scoped admins cannot assign super_admin role.
  const isProviderScoped = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role !== "super_admin") return false;
    return (
      currentUser.provider !== null &&
      currentUser.provider !== "PT Gapura Angkasa"
    );
  }, [currentUser]);

  // Role check: hanya super_admin yang boleh mengakses halaman ini.
  if (canAccess === false) {
    if (typeof window !== "undefined") {
      router.replace(ROUTES.DASHBOARD);
    }
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Hanya Super Admin yang dapat mengakses halaman ini.
        </p>
      </div>
    );
  }

  if (canAccess === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleRoleFilterChange(value: string | null) {
    setRole(value);
    setPage(1);
  }

  function handleStatusFilterChange(value: string | null) {
    setStatus(value);
    setPage(1);
  }

  function handleResetConfirm() {
    if (!resetTarget) return;
    resetMutation.mutate(resetTarget.id, {
      onSuccess: () => {
        setResetTarget(null);
      },
    });
  }

  function handleDeactivateConfirm() {
    if (!deactivateTarget) return;
    deleteMutation.mutate(deactivateTarget.id, {
      onSuccess: () => {
        setDeactivateTarget(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <Users2 className="size-7 text-primary" />
            Management User
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun pengguna sistem Kelola SDM Gapura Angkasa.
          </p>
        </div>
        <Button
          type="button"
          className="gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Tambah Pengguna
        </Button>
      </div>

      {/* Info alert */}
      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="mt-0.5 size-5 shrink-0 text-blue-600" />
        <p className="text-sm text-blue-700">
          Akun akan dibuat secara otomatis ketika Anda melakukan import data
          karyawan atau menambahkan data karyawan baru secara manual. Password
          default = NIP.
        </p>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Pengguna"
          value={statistics.total}
          icon={<Users2 className="size-5 text-primary" />}
          accentClass="bg-primary/10"
          isLoading={isLoading}
        />
        <StatCard
          label="Aktif"
          value={statistics.active}
          icon={<UserCheck className="size-5 text-green-600" />}
          accentClass="bg-green-50"
          isLoading={isLoading}
        />
        <StatCard
          label="Nonaktif"
          value={statistics.inactive}
          icon={<UserX className="size-5 text-red-600" />}
          accentClass="bg-red-50"
          isLoading={isLoading}
        />
        <StatCard
          label="Super Admin"
          value={statistics.superAdmin}
          icon={<ShieldCheck className="size-5 text-red-600" />}
          accentClass="bg-red-50"
          isLoading={isLoading}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Cari NIP, nama, atau email..."
        />
        <Select
          value={role ?? ALL_VALUE}
          onValueChange={(next) => {
            const asString = next as string;
            handleRoleFilterChange(asString === ALL_VALUE ? null : asString);
          }}
        >
          <SelectTrigger className="h-10 min-w-[170px]">
            <SelectValue>
              {(current: string) =>
                current === ALL_VALUE ? (
                  <span className="text-muted-foreground">Semua Role</span>
                ) : (
                  <span>{ROLE_LABELS[current as UserRole] ?? current}</span>
                )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              <span className="text-muted-foreground">Semua Role</span>
            </SelectItem>
            {USER_ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {ROLE_LABELS[opt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status ?? ALL_VALUE}
          onValueChange={(next) => {
            const asString = next as string;
            handleStatusFilterChange(asString === ALL_VALUE ? null : asString);
          }}
        >
          <SelectTrigger className="h-10 min-w-[150px]">
            <SelectValue>
              {(current: string) =>
                current === ALL_VALUE ? (
                  <span className="text-muted-foreground">Semua Status</span>
                ) : (
                  <span>
                    {STATUS_OPTIONS.find((o) => o.value === current)?.label ??
                      current}
                  </span>
                )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              <span className="text-muted-foreground">Semua Status</span>
            </SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error state */}
      {query.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Gagal memuat daftar pengguna:{" "}
          {query.error instanceof Error ? query.error.message : "Unknown error"}
        </div>
      )}

      {/* Table */}
      <UserTable
        users={users}
        isLoading={isLoading}
        currentUserId={currentUser?.id ?? null}
        onEditRole={(u) => setEditRoleTarget(u)}
        onResetPassword={(u) => setResetTarget(u)}
        onDeactivate={(u) => setDeactivateTarget(u)}
      />

      {/* Pagination */}
      {pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Dialogs */}
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditRoleDialog
        open={editRoleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditRoleTarget(null);
        }}
        user={editRoleTarget}
        hideSuperAdmin={isProviderScoped}
      />
      <ResetPasswordDialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
        user={resetTarget}
        onConfirm={handleResetConfirm}
        isPending={resetMutation.isPending}
      />
      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (deleteMutation.isPending) return;
          if (!open) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menonaktifkan{" "}
              <span className="font-semibold text-foreground">
                {deactivateTarget?.full_name ?? "-"}
              </span>{" "}
              (NIP: {deactivateTarget?.nip ?? "-"})? Pengguna tidak akan dapat
              login lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDeactivateConfirm();
              }}
              className="gap-2"
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {deleteMutation.isPending ? "Memproses..." : "Nonaktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
