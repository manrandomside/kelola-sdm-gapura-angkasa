"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSidebarStore } from "@/stores/sidebar-store";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isMobileOpen = useSidebarStore((s) => s.isMobileOpen);
  const setOpen = useSidebarStore((s) => s.setOpen);
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);

  const { user, isLoading, logout, isLoggingOut } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Memuat sesi...</div>
      </div>
    );
  }

  function handleLogout() {
    void logout();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — fixed, always visible at lg+ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-all duration-300 lg:block",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <Sidebar
          role={user.role}
          userName={user.full_name}
          nip={user.nip}
          provider={user.provider}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {/* Mobile sidebar — drawer */}
      <Sheet open={isMobileOpen} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu Navigasi</SheetTitle>
          </SheetHeader>
          <Sidebar
            role={user.role}
            userName={user.full_name}
            nip={user.nip}
            provider={user.provider}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
            isMobileDrawer
          />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          isCollapsed ? "lg:pl-16" : "lg:pl-64",
        )}
      >
        <TopBar />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
