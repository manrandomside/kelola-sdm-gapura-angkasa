"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUser } from "@/hooks/use-users";
import { USER_ROLE_OPTIONS } from "@/lib/constants/enums";
import { cn } from "@/lib/utils";
import {
  createUserSchema,
  type CreateUserInput,
} from "@/lib/validations/user";

import type { UserRole } from "@/lib/constants/enums";

// Input type (sebelum transform) — email masih string/null/undefined.
type CreateUserFormValues = z.input<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
};

// Gunakan string kosong untuk email supaya input tetap controlled;
// Zod transform akan menormalkan "" -> null saat submit.
const DEFAULT_VALUES: CreateUserFormValues = {
  nip: "",
  full_name: "",
  password: "",
  role: "staff",
  email: "",
};

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateUserFormValues, unknown, CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const nipValue = watch("nip");
  const passwordValue = watch("password");

  // Auto-fill password = NIP saat user mengetik NIP, selama user belum
  // mengubah password secara manual.
  useEffect(() => {
    if (!passwordValue || passwordValue === "" || passwordValue === nipValue) {
      setValue("password", nipValue ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nipValue]);

  useEffect(() => {
    if (!open) {
      reset(DEFAULT_VALUES);
    }
  }, [open, reset]);

  function onSubmit(data: CreateUserInput) {
    createMutation.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  }

  const isPending = createMutation.isPending;

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
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          <DialogDescription>
            Password default akan otomatis menggunakan NIP. Pengguna dapat
            mengubahnya setelah login pertama.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="nip">
              NIP <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nip"
              {...register("nip")}
              placeholder="Contoh: 2160001"
              className={cn(errors.nip && "border-destructive")}
              disabled={isPending}
            />
            {errors.nip && (
              <p className="text-xs text-destructive">{errors.nip.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Nama Lengkap <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              {...register("full_name")}
              placeholder="Nama lengkap pengguna"
              className={cn(errors.full_name && "border-destructive")}
              disabled={isPending}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">
                {errors.full_name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="opsional — kosongkan untuk email default"
              className={cn(errors.email && "border-destructive")}
              disabled={isPending}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Kosongkan untuk memakai format default {`{nip}@gapura.internal`}.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="text"
              {...register("password")}
              placeholder="Auto-fill = NIP"
              className={cn(errors.password && "border-destructive")}
              disabled={isPending}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimal 6 karakter. Default menggunakan NIP.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(next) => field.onChange(next as UserRole)}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>
                      {(current: string) =>
                        current ? ROLE_LABELS[current as UserRole] : "Pilih role"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {ROLE_LABELS[opt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-xs text-destructive">{errors.role.message}</p>
            )}
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
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
