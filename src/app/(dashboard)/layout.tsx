import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppShell>
        <ErrorBoundary>{children}</ErrorBoundary>
      </AppShell>
      <Toaster
        position="top-right"
        duration={4000}
        richColors
        closeButton
        theme="light"
      />
    </>
  );
}
