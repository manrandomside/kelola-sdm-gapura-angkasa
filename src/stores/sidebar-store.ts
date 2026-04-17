import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  // Mobile drawer visibility.
  isMobileOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;

  // Desktop collapsed state (persisted to localStorage).
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isMobileOpen: false,
      open: () => set({ isMobileOpen: true }),
      close: () => set({ isMobileOpen: false }),
      toggle: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
      setOpen: (isMobileOpen) => set({ isMobileOpen }),

      isCollapsed: false,
      toggleCollapsed: () =>
        set((state) => ({ isCollapsed: !state.isCollapsed })),
      setCollapsed: (isCollapsed) => set({ isCollapsed }),
    }),
    {
      name: "sidebar-collapsed",
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    },
  ),
);
