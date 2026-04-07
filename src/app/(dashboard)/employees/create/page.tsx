"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { EmployeeForm } from "@/components/employees/employee-form";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/lib/constants/routes";

export default function EmployeeCreatePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  const canEdit = user?.role === "super_admin" || user?.role === "admin";

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
        <h1 className="text-xl font-bold text-destructive">
          Anda tidak memiliki akses
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman ini hanya dapat diakses oleh admin atau super admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href={ROUTES.DASHBOARD} className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="size-4" />
        <Link href={ROUTES.EMPLOYEES} className="hover:text-foreground">
          Management Karyawan
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">Tambah</span>
      </nav>

      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Tambah Karyawan
        </h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi data karyawan pada keempat tab di bawah ini.
        </p>
      </div>

      <EmployeeForm />
    </div>
  );
}
