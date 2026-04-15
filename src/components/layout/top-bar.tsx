"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home, Menu } from "lucide-react";

import { ROUTES } from "@/lib/constants/routes";

import { useSidebarStore } from "@/stores/sidebar-store";

// Static label lookup. Dynamic IDs (e.g. /employees/[id]) get a generic label.
const ROUTE_LABELS: Record<string, string> = {
  [ROUTES.DASHBOARD]: "Dashboard",
  [ROUTES.EMPLOYEES]: "Daftar Karyawan",
  [ROUTES.EMPLOYEES_CREATE]: "Tambah Karyawan",
  [ROUTES.IMPORT]: "Import Excel",
  "/import/logs": "Riwayat Import",
  [ROUTES.USERS]: "Management User",
  [ROUTES.ACTIVITY_LOGS]: "Activity Log",
};

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [];
  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    acc += `/${segment}`;
    const isLast = i === segments.length - 1;

    let label = ROUTE_LABELS[acc];
    if (!label) {
      // Dynamic segment fallback (e.g. employee id, edit, etc.)
      if (segment === "edit") label = "Edit";
      else if (/^\d+$/.test(segment)) label = "Detail";
      else label = segment.replace(/-/g, " ");
    }

    crumbs.push({ label, href: isLast ? undefined : acc });
  }
  return crumbs;
}

export function TopBar() {
  const pathname = usePathname();
  const openMobile = useSidebarStore((s) => s.open);

  const crumbs = buildCrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <button
        type="button"
        onClick={openMobile}
        aria-label="Buka menu navigasi"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          <li className="flex items-center">
            <Link
              href={ROUTES.DASHBOARD}
              className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Beranda</span>
            </Link>
          </li>
          {crumbs.map((crumb, idx) => (
            <li key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5">
              <ChevronRight
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="truncate font-medium text-foreground"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}
