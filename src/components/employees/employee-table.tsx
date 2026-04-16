"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ContractBadge } from "@/components/employees/contract-badge";
import { DeleteEmployeeDialog } from "@/components/employees/delete-employee-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useDeleteEmployee } from "@/hooks/use-employee-detail";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { getContractInfo } from "@/lib/utils/contract";

import type { EmployeeListItem } from "@/hooks/use-employees";
import type { UserRole } from "@/lib/constants/enums";

interface EmployeeTableProps {
  employees: EmployeeListItem[];
  isLoading: boolean;
  page: number;
  limit: number;
  sort: string;
  order: "asc" | "desc";
  onSort: (column: string) => void;
  canEdit: boolean;
  userRole: UserRole;
  selectedIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
}

interface ColumnDef {
  key: string;
  header: string;
  sortable: boolean;
  className?: string;
  headClassName?: string;
}

const DATA_COLUMNS: ColumnDef[] = [
  { key: "no", header: "No", sortable: false, className: "w-[60px] text-center", headClassName: "w-[60px] text-center" },
  { key: "nama_lengkap", header: "Nama Lengkap", sortable: true, className: "min-w-[220px]" },
  { key: "nip", header: "NIP", sortable: true, className: "w-[130px]" },
  { key: "unit_organisasi", header: "Unit Organisasi", sortable: true, className: "w-[150px]" },
  { key: "nama_jabatan", header: "Jabatan", sortable: false, className: "min-w-[200px] max-w-[280px]" },
  { key: "status_pegawai", header: "Status Pegawai", sortable: true, className: "w-[150px]" },
  { key: "status_kerja", header: "Status Kerja", sortable: true, className: "w-[130px]" },
  { key: "kontrak", header: "Kontrak", sortable: false, className: "w-[140px]" },
  { key: "provider", header: "Provider", sortable: false, className: "w-[170px] max-w-[170px]" },
  { key: "actions", header: "Aksi", sortable: false, className: "w-[80px] text-right" },
];

function SortIcon({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="ml-1 inline size-3.5 text-muted-foreground/60" />;
  return order === "asc" ? (
    <ArrowUp className="ml-1 inline size-3.5 text-primary" />
  ) : (
    <ArrowDown className="ml-1 inline size-3.5 text-primary" />
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <UsersRound className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">
          Tidak ada data karyawan
        </p>
        <p className="text-sm text-muted-foreground">
          Coba ubah filter pencarian atau import data karyawan terlebih dahulu.
        </p>
      </div>
    </div>
  );
}

/** Total columns: 1 checkbox + DATA_COLUMNS */
const TOTAL_COL_COUNT = DATA_COLUMNS.length + 1;

function LoadingRows({ limit }: { limit: number }) {
  return (
    <>
      {Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell className="w-[44px] text-center">
            <Skeleton className="mx-auto size-4" />
          </TableCell>
          {DATA_COLUMNS.map((col) => (
            <TableCell key={col.key} className={col.className}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function EmployeeTable({
  employees,
  isLoading,
  page,
  limit,
  sort,
  order,
  onSort,
  canEdit,
  selectedIds,
  onSelectionChange,
}: EmployeeTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    nama_lengkap: string;
    nip: string;
  } | null>(null);
  const deleteMutation = useDeleteEmployee();

  function handleDeleteClick(emp: EmployeeListItem) {
    setDeleteTarget({
      id: emp.id,
      nama_lengkap: emp.nama_lengkap,
      nip: emp.nip,
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  }

  // Selection helpers
  const pageIds = employees.map((e) => e.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id));
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected;

  function handleSelectAll(checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) {
      for (const id of pageIds) next.add(id);
    } else {
      for (const id of pageIds) next.delete(id);
    }
    onSelectionChange(next);
  }

  function handleToggleRow(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[44px] text-center">
              <Checkbox
                checked={allOnPageSelected}
                indeterminate={someOnPageSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Pilih semua di halaman ini"
              />
            </TableHead>
            {DATA_COLUMNS.map((col) => {
              const isActiveSort = sort === col.key;
              return (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    col.headClassName ?? col.className,
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                  )}
                  onClick={col.sortable ? () => onSort(col.key) : undefined}
                >
                  {col.header}
                  {col.sortable && <SortIcon active={isActiveSort} order={order} />}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading && employees.length === 0 ? (
            <LoadingRows limit={limit} />
          ) : employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={TOTAL_COL_COUNT} className="p-0">
                <EmptyState />
              </TableCell>
            </TableRow>
          ) : (
            employees.map((emp, idx) => {
              const rowNumber = (page - 1) * limit + idx + 1;
              const detailHref = ROUTES.EMPLOYEES_DETAIL(emp.id);
              const editHref = ROUTES.EMPLOYEES_EDIT(emp.id);
              const isSelected = selectedIds.has(emp.id);

              const contractInfo = getContractInfo(emp.tmt_berakhir_kerja);
              const contractBg =
                contractInfo.status === "danger"
                  ? "bg-red-50/30"
                  : contractInfo.status === "expired"
                    ? "bg-gray-50/50"
                    : "";

              return (
                <TableRow
                  key={emp.id}
                  className={cn(
                    "group cursor-pointer hover:bg-gray-50",
                    isSelected ? "bg-primary/5 hover:bg-primary/5" : contractBg,
                  )}
                  onClick={() => router.push(detailHref)}
                >
                  <TableCell className="w-[44px] text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleRow(emp.id)}
                      aria-label={`Pilih ${emp.nama_lengkap}`}
                    />
                  </TableCell>
                  <TableCell className="w-[60px] text-center text-sm text-muted-foreground">
                    {rowNumber}
                  </TableCell>
                  <TableCell className="min-w-[220px] font-medium">
                    <Link
                      href={detailHref}
                      className="text-foreground hover:text-primary hover:underline"
                    >
                      {emp.nama_lengkap}
                    </Link>
                    {emp.nik && (
                      <div className="text-xs text-muted-foreground">
                        NIK: {emp.nik}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[130px] font-mono text-sm">
                    {emp.nip}
                  </TableCell>
                  <TableCell className="w-[150px] text-sm">
                    {emp.unit_organisasi ?? "-"}
                  </TableCell>
                  <TableCell className="min-w-[200px] max-w-[280px] truncate text-sm">
                    {emp.nama_jabatan ?? "-"}
                  </TableCell>
                  <TableCell className="w-[150px]">
                    <StatusBadge type="status_pegawai" value={emp.status_pegawai} />
                  </TableCell>
                  <TableCell className="w-[130px]">
                    <StatusBadge type="status_kerja" value={emp.status_kerja} />
                  </TableCell>
                  <TableCell className="w-[140px]">
                    {emp.tmt_berakhir_kerja ? (
                      <ContractBadge
                        tmtBerakhirKerja={emp.tmt_berakhir_kerja}
                        size="sm"
                        showLabel
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="w-[170px] max-w-[170px] truncate text-sm text-muted-foreground">
                    {emp.provider ?? "-"}
                  </TableCell>
                  <TableCell className="w-[80px] text-right" onClick={(e) => e.stopPropagation()}>
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
                        <DropdownMenuItem onClick={() => router.push(detailHref)}>
                          <Eye className="size-4" />
                          Lihat
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => router.push(editHref)}>
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDeleteClick(emp)}
                          >
                            <Trash2 className="size-4" />
                            Hapus
                          </DropdownMenuItem>
                        )}
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

      <DeleteEmployeeDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        employee={deleteTarget}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
