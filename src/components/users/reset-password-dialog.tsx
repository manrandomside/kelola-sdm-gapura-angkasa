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

import type { UserListItem } from "@/hooks/use-users";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem | null;
  onConfirm: () => void;
  isPending: boolean;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isPending,
}: ResetPasswordDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Password Pengguna</AlertDialogTitle>
          <AlertDialogDescription>
            Password untuk{" "}
            <span className="font-semibold text-foreground">
              {user?.full_name ?? "-"}
            </span>{" "}
            (NIP: {user?.nip ?? "-"}) akan direset ke NIP. Pengguna harus
            mengganti password setelah login berikutnya.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            className="gap-2"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "Mereset..." : "Reset Password"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
