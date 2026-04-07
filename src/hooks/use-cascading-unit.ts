"use client";

import { useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

export interface UnitOption {
  id: number;
  unit_organisasi: string;
  kode: string;
  nama: string;
}

export interface SubUnitOption {
  id: number;
  unit_id: number;
  nama: string;
  kode: string | null;
}

interface UnitListResponse {
  units: UnitOption[];
}

interface SubUnitListResponse {
  sub_units: SubUnitOption[];
}

async function fetchUnits(unitOrganisasi: string): Promise<UnitOption[]> {
  const sp = new URLSearchParams({ unit_organisasi: unitOrganisasi });
  const res = await fetch(`/api/units?${sp.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as ApiResponse<UnitListResponse>;
  if (!json.success) throw new Error(json.error.message);
  return json.data.units;
}

async function fetchSubUnits(unitId: number): Promise<SubUnitOption[]> {
  const res = await fetch(`/api/units/${unitId}/sub-units`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as ApiResponse<SubUnitListResponse>;
  if (!json.success) throw new Error(json.error.message);
  return json.data.sub_units;
}

export function useCascadingUnit(
  selectedUnitOrganisasi: string | null,
  selectedUnitId: number | null,
) {
  const unitsQuery = useQuery({
    queryKey: ["units", selectedUnitOrganisasi],
    queryFn: () => fetchUnits(selectedUnitOrganisasi!),
    enabled: !!selectedUnitOrganisasi,
    staleTime: 5 * 60 * 1000,
  });

  const subUnitsQuery = useQuery({
    queryKey: ["sub-units", selectedUnitId],
    queryFn: () => fetchSubUnits(selectedUnitId!),
    enabled: !!selectedUnitId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    units: unitsQuery.data ?? [],
    subUnits: subUnitsQuery.data ?? [],
    isLoadingUnits: unitsQuery.isLoading,
    isLoadingSubUnits: subUnitsQuery.isLoading,
  };
}
