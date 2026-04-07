import { NextResponse } from "next/server";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { employee } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

// Whitelist kolom yang boleh dipakai untuk sorting, mencegah SQL injection via
// parameter `sort`.
const SORTABLE_COLUMNS = {
  nama_lengkap: employee.nama_lengkap,
  nip: employee.nip,
  unit_organisasi: employee.unit_organisasi,
  status_pegawai: employee.status_pegawai,
  status_kerja: employee.status_kerja,
} as const;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

interface EmployeeListItem {
  id: number;
  no: number | null;
  nip: string;
  nik: string | null;
  nama_lengkap: string;
  jenis_kelamin: string | null;
  unit_organisasi: string | null;
  nama_jabatan: string | null;
  status_pegawai: string | null;
  status_kontrak: string | null;
  status_kerja: string | null;
  provider: string | null;
  cabang: string | null;
}

interface EmployeeStatistics {
  total: number;
  pegawaiTetap: number;
  tad: number;
  aktif: number;
  nonAktif: number;
}

interface EmployeeListResponse {
  employees: EmployeeListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: EmployeeStatistics;
}

function fail(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message } },
    { status },
  );
}

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max?: number,
): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  if (max && n > max) return max;
  return n;
}

export async function GET(request: Request) {
  // Auth check — semua role yang sudah login bisa akses list karyawan.
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const { searchParams } = new URL(request.url);

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);
  const search = searchParams.get("search")?.trim() ?? "";
  const statusPegawai = searchParams.get("status_pegawai")?.trim() || null;
  const statusKontrak = searchParams.get("status_kontrak")?.trim() || null;
  const unitOrganisasi = searchParams.get("unit_organisasi")?.trim() || null;
  const provider = searchParams.get("provider")?.trim() || null;
  const statusKerja = searchParams.get("status_kerja")?.trim() || null;

  const sortParam = searchParams.get("sort") ?? "nama_lengkap";
  const sortKey: SortableColumn =
    sortParam in SORTABLE_COLUMNS
      ? (sortParam as SortableColumn)
      : "nama_lengkap";
  const order = searchParams.get("order") === "desc" ? "desc" : "asc";

  // Build WHERE conditions secara konsisten untuk list, count, dan statistik.
  const conditions: SQL[] = [];

  if (search.length > 0) {
    const pattern = `%${search}%`;
    const searchCondition = or(
      ilike(employee.nama_lengkap, pattern),
      ilike(employee.nip, pattern),
      ilike(employee.nik, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (statusPegawai) conditions.push(eq(employee.status_pegawai, statusPegawai));
  if (statusKontrak) conditions.push(eq(employee.status_kontrak, statusKontrak));
  if (unitOrganisasi)
    conditions.push(eq(employee.unit_organisasi, unitOrganisasi));
  if (provider) conditions.push(eq(employee.provider, provider));
  if (statusKerja) conditions.push(eq(employee.status_kerja, statusKerja));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = SORTABLE_COLUMNS[sortKey];
  const orderBy = order === "desc" ? desc(sortColumn) : asc(sortColumn);

  try {
    // Query list + count + statistics secara paralel.
    const [rows, totalRows, statsRows] = await Promise.all([
      db
        .select({
          id: employee.id,
          no: employee.no,
          nip: employee.nip,
          nik: employee.nik,
          nama_lengkap: employee.nama_lengkap,
          jenis_kelamin: employee.jenis_kelamin,
          unit_organisasi: employee.unit_organisasi,
          nama_jabatan: employee.nama_jabatan,
          status_pegawai: employee.status_pegawai,
          status_kontrak: employee.status_kontrak,
          status_kerja: employee.status_kerja,
          provider: employee.provider,
          cabang: employee.cabang,
        })
        .from(employee)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),

      db
        .select({ value: count() })
        .from(employee)
        .where(whereClause),

      db
        .select({
          total: count(),
          pegawaiTetap: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'PEGAWAI TETAP')`,
          tad: sql<number>`count(*) filter (where ${employee.status_pegawai} = 'TAD')`,
          aktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Aktif')`,
          nonAktif: sql<number>`count(*) filter (where ${employee.status_kerja} = 'Non Aktif')`,
        })
        .from(employee)
        .where(whereClause),
    ]);

    const total = Number(totalRows[0]?.value ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const statsRow = statsRows[0];
    const statistics: EmployeeStatistics = {
      total: Number(statsRow?.total ?? 0),
      pegawaiTetap: Number(statsRow?.pegawaiTetap ?? 0),
      tad: Number(statsRow?.tad ?? 0),
      aktif: Number(statsRow?.aktif ?? 0),
      nonAktif: Number(statsRow?.nonAktif ?? 0),
    };

    return NextResponse.json<ApiResponse<EmployeeListResponse>>({
      success: true,
      data: {
        employees: rows,
        pagination: { page, limit, total, totalPages },
        statistics,
      },
    });
  } catch (err) {
    logger.error("Failed to fetch employees", err);
    return fail(500, "INTERNAL_ERROR", "Gagal mengambil data karyawan");
  }
}
