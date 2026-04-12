"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateUser } from "@/hooks/use-users";
import { USER_ROLE_OPTIONS } from "@/lib/constants/enums";

import type { UserRole } from "@/lib/constants/enums";
import type { UserListItem } from "@/hooks/use-users";

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem | null;
  /** When true, hide the super_admin option (provider-scoped admins). */
  hideSuperAdmin?: boolean;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
};

export function EditRoleDialog({
  open,
  onOpenChange,
  user,
  hideSuperAdmin = false,
}: EditRoleDialogProps) {
  const [role, setRole] = useState<UserRole>("staff");
  const updateMutation = useUpdateUser();

  useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user]);

  function handleSave() {
    if (!user) return;
    if (role === user.role) {
      onOpenChange(false);
      return;
    }
    updateMutation.mutate(
      { id: user.id, payload: { role } },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

  const isPending = updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Role Pengguna</DialogTitle>
          <DialogDescription>
            Ubah role untuk{" "}
            <span className="font-semibold text-foreground">
              {user?.full_name ?? "-"}
            </span>{" "}
            (NIP: {user?.nip ?? "-"}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Select
            value={role}
            onValueChange={(next) => setRole(next as UserRole)}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                {(current: string) =>
                  current ? ROLE_LABELS[current as UserRole] : "Pilih role"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {USER_ROLE_OPTIONS
                .filter((opt) => !(hideSuperAdmin && opt === "super_admin"))
                .map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {ROLE_LABELS[opt]}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            disabled={isPending}
            className="gap-2"
            onClick={handleSave}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
