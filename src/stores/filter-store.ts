import { create } from "zustand";

// State filter untuk halaman daftar karyawan. Dipisahkan dari URL supaya
// interaksi terasa instan; sinkronisasi ke URL bisa ditambahkan nanti.
export type FilterKey =
  | "status_pegawai"
  | "status_kontrak"
  | "unit_organisasi"
  | "provider"
  | "status_kerja";

export type SortOrder = "asc" | "desc";

interface FilterState {
  search: string;
  status_pegawai: string | null;
  status_kontrak: string | null;
  unit_organisasi: string | null;
  provider: string | null;
  status_kerja: string | null;
  sort: string;
  order: SortOrder;
  page: number;
  limit: number;

  setSearch: (value: string) => void;
  setFilter: (key: FilterKey, value: string | null) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setSort: (sort: string, order?: SortOrder) => void;
  toggleSort: (sort: string) => void;
  resetAll: () => void;
  activeFilterCount: () => number;
}

const INITIAL_STATE = {
  search: "",
  status_pegawai: null,
  status_kontrak: null,
  unit_organisasi: null,
  provider: null,
  status_kerja: null,
  sort: "nama_lengkap",
  order: "asc" as SortOrder,
  page: 1,
  limit: 20,
};

export const useFilterStore = create<FilterState>((set, get) => ({
  ...INITIAL_STATE,

  setSearch: (value) => set({ search: value, page: 1 }),

  setFilter: (key, value) =>
    set((state) => ({ ...state, [key]: value, page: 1 })),

  clearFilters: () =>
    set({
      status_pegawai: null,
      status_kontrak: null,
      unit_organisasi: null,
      provider: null,
      status_kerja: null,
      page: 1,
    }),

  setPage: (page) => set({ page }),

  setSort: (sort, order = "asc") => set({ sort, order, page: 1 }),

  toggleSort: (sort) =>
    set((state) => {
      if (state.sort === sort) {
        return { order: state.order === "asc" ? "desc" : "asc", page: 1 };
      }
      return { sort, order: "asc", page: 1 };
    }),

  resetAll: () => set({ ...INITIAL_STATE }),

  activeFilterCount: () => {
    const s = get();
    return [
      s.status_pegawai,
      s.status_kontrak,
      s.unit_organisasi,
      s.provider,
      s.status_kerja,
    ].filter((v) => v !== null).length;
  },
}));
