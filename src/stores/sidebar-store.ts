import { create } from "zustand";

// Mobile sidebar visibility state.
// Desktop sidebar is always visible (≥ lg breakpoint), so this store
// only tracks the overlay drawer for mobile / tablet.
interface SidebarState {
  isMobileOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isMobileOpen: false,
  open: () => set({ isMobileOpen: true }),
  close: () => set({ isMobileOpen: false }),
  toggle: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  setOpen: (isMobileOpen) => set({ isMobileOpen }),
}));
