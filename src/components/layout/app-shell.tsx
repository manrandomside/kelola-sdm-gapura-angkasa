"use client";

import type { ReactNode } from "react";

import type { UserRole } from "@/lib/constants/enums";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useSidebarStore } from "@/stores/sidebar-store";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface AppShellProps {
  children: ReactNode;
}

// Hardcoded session for now. Once Task 6 (auth) lands, AppShell will read
// these from the actual Supabase session.
const PLACEHOLDER_ROLE: UserRole = "super_admin";
const PLACEHOLDER_USER_NAME = "Super Administrator";

export function AppShell({ children }: AppShellProps) {
  const isMobileOpen = useSidebarStore((s) => s.isMobileOpen);
  const setOpen = useSidebarStore((s) => s.setOpen);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar — fixed, always visible at lg+ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <Sidebar role={PLACEHOLDER_ROLE} userName={PLACEHOLDER_USER_NAME} />
      </aside>

      {/* Mobile sidebar — drawer */}
      <Sheet open={isMobileOpen} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu Navigasi</SheetTitle>
          </SheetHeader>
          <Sidebar role={PLACEHOLDER_ROLE} userName={PLACEHOLDER_USER_NAME} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <TopBar />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
