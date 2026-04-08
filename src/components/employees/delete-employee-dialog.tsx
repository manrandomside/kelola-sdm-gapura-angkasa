"use client";

import { Loader2 } from "lucide-react";

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

interface DeleteEmployeeDialogEmployee {
  id: number;
  nama_lengkap: string;
  nip: string;
}

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: DeleteEmployeeDialogEmployee | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employee,
  onConfirm,
  isDeleting,
}: DeleteEmployeeDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isDeleting) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Data Karyawan</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus data karyawan{" "}
            <span className="font-semibold text-foreground">
              {employee?.nama_lengkap ?? "-"}
            </span>{" "}
            (NIP: {employee?.nip ?? "-"})? Data yang dihapus tidak dapat
            dikembalikan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            className="gap-2"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            {isDeleting ? "Menghapus..." : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
