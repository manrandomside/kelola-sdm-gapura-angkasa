"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  ChevronDown,
  FileSpreadsheet,
  FileText,

  LayoutDashboard,
  List,
  LogOut,
  Shield,
  TableProperties,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/lib/constants/routes";
import type { UserRole } from "@/lib/constants/enums";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { useSidebarStore } from "@/stores/sidebar-store";

// ---------------------------------------------------------------------------
// Menu definition
// ---------------------------------------------------------------------------

interface NavLeaf {
  type: "leaf";
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: ReadonlyArray<UserRole>;
}

interface NavGroup {
  type: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: ReadonlyArray<NavLeaf>;
}

type NavItem = NavLeaf | NavGroup;

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    type: "leaf",
    label: "Dashboard",
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    type: "group",
    id: "management-karyawan",
    label: "Management Karyawan",
    icon: Users,
    children: [
      {
        type: "leaf",
        label: "Daftar Karyawan",
        href: ROUTES.EMPLOYEES,
        icon: List,
      },
      {
        type: "leaf",
        label: "Tambah Karyawan",
        href: ROUTES.EMPLOYEES_CREATE,
        icon: UserPlus,
        roles: ["super_admin", "admin"],
      },
    ],
  },
  {
    type: "leaf",
    label: "Rekap SDM",
    href: ROUTES.REKAP_SDM,
    icon: TableProperties,
  },
  {
    type: "leaf",
    label: "Analitik",
    href: ROUTES.ANALYTICS,
    icon: TrendingUp,
  },
  {
    type: "leaf",
    label: "Asisten SDM",
    href: ROUTES.ASSISTANT,
    icon: Bot,
  },
  {
    type: "group",
    id: "import-export",
    label: "Import & Export",
    icon: FileSpreadsheet,
    children: [
      {
        type: "leaf",
        label: "Import Excel",
        href: ROUTES.IMPORT,
        icon: Upload,
        roles: ["super_admin", "admin"],
      },
      {
        type: "leaf",
        label: "Laporan PDF",
        href: ROUTES.REPORTS,
        icon: FileText,
      },
    ],
  },
  {
    type: "leaf",
    label: "Management User",
    href: ROUTES.USERS,
    icon: Shield,
    roles: ["super_admin"],
  },
  {
    type: "leaf",
    label: "Activity Log",
    href: ROUTES.ACTIVITY_LOGS,
    icon: Activity,
  },
];

function canSee(item: { roles?: ReadonlyArray<UserRole> }, role: UserRole): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(role);
}

function isLeafActive(href: string, pathname: string): boolean {
  if (href === pathname) return true;
  // Treat sub-routes as active for the parent leaf (e.g. /employees/123 → /employees).
  return pathname.startsWith(`${href}/`);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SidebarProps {
  role: UserRole;
  userName: string;
  provider?: string | null;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({
  role,
  userName,
  provider,
  onLogout,
  isLoggingOut = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const closeMobile = useSidebarStore((s) => s.close);

  // Filter once per render based on role.
  const visibleItems = useMemo(() => {
    const result: NavItem[] = [];
    for (const item of NAV_ITEMS) {
      if (item.type === "leaf") {
        if (canSee(item, role)) result.push(item);
      } else {
        const visibleChildren = item.children.filter((child) => canSee(child, role));
        if (visibleChildren.length > 0) {
          result.push({ ...item, children: visibleChildren });
        }
      }
    }
    return result;
  }, [role]);

  // Auto-expand a group if any of its children matches current pathname.
  const initialOpenGroups = useMemo(() => {
    const open: Record<string, boolean> = {};
    for (const item of visibleItems) {
      if (item.type === "group") {
        open[item.id] = item.children.some((c) => isLeafActive(c.href, pathname));
      }
    }
    return open;
  }, [visibleItems, pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    initialOpenGroups,
  );

  // Re-sync expanded groups when route changes (so navigating into a group
  // sub-page from elsewhere opens that group).
  useEffect(() => {
    setOpenGroups((prev) => ({ ...prev, ...initialOpenGroups }));
  }, [initialOpenGroups]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleNavigate() {
    closeMobile();
    onNavigate?.();
  }

  return (
    <aside className="flex h-full w-full flex-col glass-sidebar">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-5">
        <Image
          src="/images/logo-sidebar.png"
          alt="Gapura Angkasa"
          width={140}
          height={40}
          priority
          className="h-10 w-auto object-contain"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground">Kelola SDM</span>
          <span className="text-xs text-muted-foreground">Gapura Angkasa</span>
        </div>
      </div>

      <Separator />

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {visibleItems.map((item) =>
            item.type === "leaf" ? (
              <li key={item.href}>
                <NavLeafLink
                  item={item}
                  active={isLeafActive(item.href, pathname)}
                  onNavigate={handleNavigate}
                />
              </li>
            ) : (
              <li key={item.id}>
                <NavGroupItem
                  item={item}
                  pathname={pathname}
                  open={openGroups[item.id] ?? false}
                  onToggle={() => toggleGroup(item.id)}
                  onNavigate={handleNavigate}
                />
              </li>
            ),
          )}
        </ul>
      </nav>

      <Separator />

      {/* Footer: user info + logout */}
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {userName}
            </p>
            <Badge
              variant="secondary"
              className="mt-1 bg-accent text-accent-foreground"
            >
              {roleLabel(role)}
            </Badge>
            {provider && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {provider}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface NavLeafLinkProps {
  item: NavLeaf;
  active: boolean;
  onNavigate: () => void;
  nested?: boolean;
}

function NavLeafLink({ item, active, onNavigate, nested = false }: NavLeafLinkProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        nested && "pl-10",
        active
          ? "bg-accent text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

interface NavGroupItemProps {
  item: NavGroup;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

function NavGroupItem({
  item,
  pathname,
  open,
  onToggle,
  onNavigate,
}: NavGroupItemProps) {
  const Icon = item.icon;
  const hasActiveChild = item.children.some((c) => isLeafActive(c.href, pathname));

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          hasActiveChild
            ? "text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            hasActiveChild ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden="true"
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <ul className="overflow-hidden">
          <li className="flex flex-col gap-1 pt-1">
            {item.children.map((child) => (
              <NavLeafLink
                key={child.href}
                item={child}
                active={isLeafActive(child.href, pathname)}
                onNavigate={onNavigate}
                nested
              />
            ))}
          </li>
        </ul>
      </div>
    </div>
  );
}

function roleLabel(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "staff":
      return "Staff";
  }
}
