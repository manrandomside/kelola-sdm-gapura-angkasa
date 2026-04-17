"use client";

import { useQuery } from "@tanstack/react-query";

import { useDebounce } from "./use-debounce";
import type { ApiResponse } from "@/types/api";

export interface SearchResultEmployee {
  id: number;
  nip: string;
  nama_lengkap: string;
  unit_organisasi: string | null;
  status_kerja: string | null;
}

interface SearchResponse {
  employees: SearchResultEmployee[];
  pagination: { total: number };
}

async function fetchSearchResults(
  query: string,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    search: query,
    limit: "5",
    page: "1",
  });
  const res = await fetch(`/api/employees?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });

  const json = (await res.json()) as ApiResponse<SearchResponse>;
  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export function useGlobalSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);
  const enabled = debouncedQuery.length >= 2;

  const result = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => fetchSearchResults(debouncedQuery),
    enabled,
    staleTime: 30_000,
  });

  return {
    ...result,
    debouncedQuery,
    employees: result.data?.employees ?? [],
    total: result.data?.pagination.total ?? 0,
  };
}
