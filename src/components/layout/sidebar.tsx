"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Key,
  LayoutDashboard,
  List,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
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
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    label: "Import & Laporan",
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
  return pathname.startsWith(`${href}/`);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SidebarProps {
  role: UserRole;
  userName: string;
  nip?: string;
  provider?: string | null;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  onNavigate?: () => void;
  /** Whether this instance is inside the mobile drawer. */
  isMobileDrawer?: boolean;
}

export function Sidebar({
  role,
  userName,
  nip,
  provider,
  onLogout,
  isLoggingOut = false,
  onNavigate,
  isMobileDrawer = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const closeMobile = useSidebarStore((s) => s.close);
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);

  // In mobile drawer, always show expanded.
  const collapsed = isMobileDrawer ? false : isCollapsed;

  const [profileOpen, setProfileOpen] = useState(false);

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

  function handleProfileAction(action: () => void) {
    setProfileOpen(false);
    action();
  }

  return (
    <TooltipProvider>
      <aside className="flex h-full w-full flex-col glass-sidebar">
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-3 px-5 py-5",
            collapsed && "justify-center px-2",
          )}
        >
          <Image
            src="/images/logo-sidebar.png"
            alt="Gapura Angkasa"
            width={collapsed ? 32 : 140}
            height={collapsed ? 32 : 40}
            priority
            className={cn(
              "object-contain",
              collapsed ? "h-8 w-8" : "h-10 w-auto",
            )}
          />
          {!collapsed && (
            <div className="flex flex-1 flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">
                Kelola SDM
              </span>
              <span className="text-xs text-muted-foreground">
                Gapura Angkasa
              </span>
            </div>
          )}
          {/* Collapse toggle — desktop only */}
          {!isMobileDrawer && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex"
              title={collapsed ? "Perluas sidebar" : "Kecilkan sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </button>
          )}
        </div>

        <Separator />

        {/* Menu */}
        <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
          <ul className="flex flex-col gap-1">
            {visibleItems.map((item) =>
              item.type === "leaf" ? (
                <li key={item.href}>
                  {collapsed ? (
                    <CollapsedLeafLink
                      item={item}
                      active={isLeafActive(item.href, pathname)}
                      onNavigate={handleNavigate}
                    />
                  ) : (
                    <NavLeafLink
                      item={item}
                      active={isLeafActive(item.href, pathname)}
                      onNavigate={handleNavigate}
                    />
                  )}
                </li>
              ) : (
                <li key={item.id}>
                  {collapsed ? (
                    <CollapsedGroupItem
                      item={item}
                      pathname={pathname}
                      onNavigate={handleNavigate}
                    />
                  ) : (
                    <NavGroupItem
                      item={item}
                      pathname={pathname}
                      open={openGroups[item.id] ?? false}
                      onToggle={() => toggleGroup(item.id)}
                      onNavigate={handleNavigate}
                    />
                  )}
                </li>
              ),
            )}
          </ul>
        </nav>

        <Separator />

        {/* Footer: user profile dropdown */}
        <div className={cn("px-3 py-3", collapsed && "px-2")}>
          <Popover open={profileOpen} onOpenChange={setProfileOpen}>
            <PopoverTrigger
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary",
                collapsed && "justify-center p-2",
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {getInitials(userName)}
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {userName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roleLabel(role)}
                    </p>
                  </div>
                  <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-64 gap-0 p-0"
            >
              {/* Profile header */}
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">{userName}</p>
                {nip && (
                  <p className="text-xs text-muted-foreground">NIP: {nip}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {roleLabel(role)}
                </p>
                {provider && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {provider}
                  </p>
                )}
              </div>

              {/* Menu items */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() =>
                    handleProfileAction(() => {
                      handleNavigate();
                      router.push(ROUTES.CHANGE_PASSWORD);
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <Key className="size-4" />
                  Ubah Password
                </button>
              </div>

              <div className="border-t p-1">
                <button
                  type="button"
                  onClick={() =>
                    handleProfileAction(() => {
                      onLogout?.();
                    })
                  }
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="size-4" />
                  {isLoggingOut ? "Keluar..." : "Keluar"}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Expanded subcomponents
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

// ---------------------------------------------------------------------------
// Collapsed subcomponents
// ---------------------------------------------------------------------------

interface CollapsedLeafLinkProps {
  item: NavLeaf;
  active: boolean;
  onNavigate: () => void;
}

function CollapsedLeafLink({ item, active, onNavigate }: CollapsedLeafLinkProps) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg transition-colors mx-auto",
              active
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          />
        }
      >
        <Icon className="size-5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

interface CollapsedGroupItemProps {
  item: NavGroup;
  pathname: string;
  onNavigate: () => void;
}

function CollapsedGroupItem({ item, pathname, onNavigate }: CollapsedGroupItemProps) {
  const Icon = item.icon;
  const hasActiveChild = item.children.some((c) => isLeafActive(c.href, pathname));
  // When collapsed, click group icon → navigate to first child.
  const firstChildHref = item.children[0]?.href ?? "#";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={firstChildHref}
            onClick={onNavigate}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg transition-colors mx-auto",
              hasActiveChild
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          />
        }
      >
        <Icon className="size-5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}
