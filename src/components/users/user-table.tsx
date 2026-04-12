"use client";

import { KeyRound, MoreHorizontal, Shield, UserCog, UserX, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeWITA } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

import type { UserRole } from "@/lib/constants/enums";
import type { UserListItem } from "@/hooks/use-users";

interface UserTableProps {
  users: UserListItem[];
  isLoading: boolean;
  currentUserId: string | null;
  onEditRole: (user: UserListItem) => void;
  onResetPassword: (user: UserListItem) => void;
  onDeactivate: (user: UserListItem) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
};

function getRoleBadgeClass(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "bg-red-50 text-red-700 border border-red-200";
    case "admin":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "staff":
    default:
      return "bg-blue-50 text-blue-700 border border-blue-200";
  }
}

function getStatusBadgeClass(status: string): string {
  return status === "active"
    ? "bg-green-50 text-green-700 border border-green-200"
    : "bg-red-50 text-red-700 border border-red-200";
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        getRoleBadgeClass(role),
      )}
    >
      <Shield className="size-3" />
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        getStatusBadgeClass(status),
      )}
    >
      {status === "active" ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={`sk-${i}`}>
          <TableCell className="w-[130px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell className="w-[200px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell className="w-[140px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell className="w-[200px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell className="w-[110px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell className="w-[180px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
          <TableCell className="w-[80px]">
            <Skeleton className="h-5 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Users2 className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">
          Tidak ada pengguna
        </p>
        <p className="text-sm text-muted-foreground">
          Coba ubah filter pencarian atau tambahkan pengguna baru.
        </p>
      </div>
    </div>
  );
}

export function UserTable({
  users,
  isLoading,
  currentUserId,
  onEditRole,
  onResetPassword,
  onDeactivate,
}: UserTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[130px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              NIP
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nama Lengkap
            </TableHead>
            <TableHead className="w-[220px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </TableHead>
            <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Role
            </TableHead>
            <TableHead className="w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Provider
            </TableHead>
            <TableHead className="w-[110px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Login Terakhir
            </TableHead>
            <TableHead className="w-[80px] text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && users.length === 0 ? (
            <LoadingRows />
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="p-0">
                <EmptyState />
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => {
              const isSelf = u.id === currentUserId;
              const isInactive = u.status === "inactive";
              return (
                <TableRow key={u.id} className="hover:bg-gray-50">
                  <TableCell className="w-[130px] font-mono text-sm">
                    {u.nip}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {u.full_name}
                    {isSelf && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                        Anda
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-[220px] max-w-[220px] truncate text-sm text-muted-foreground">
                    {u.email ?? "-"}
                  </TableCell>
                  <TableCell className="w-[140px]">
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell className="w-[200px] max-w-[200px] truncate text-sm text-muted-foreground">
                    {u.provider ?? "-"}
                  </TableCell>
                  <TableCell className="w-[110px]">
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="w-[180px] whitespace-nowrap text-sm text-muted-foreground">
                    {u.last_login_at ? formatDateTimeWITA(u.last_login_at) : "-"}
                  </TableCell>
                  <TableCell className="w-[80px] text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Buka menu aksi</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={isSelf}
                          onClick={() => onEditRole(u)}
                        >
                          <UserCog className="size-4" />
                          Ubah Role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isSelf}
                          onClick={() => onResetPassword(u)}
                        >
                          <KeyRound className="size-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isSelf || isInactive}
                          onClick={() => onDeactivate(u)}
                        >
                          <UserX className="size-4" />
                          Nonaktifkan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
