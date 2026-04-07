import { NextResponse } from "next/server";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, employee, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { createEmployeeSchema } from "@/lib/validations/employee";

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

interface CreatedEmployeeResponse {
  employee: {
    id: number;
    nip: string;
    nama_lengkap: string;
  };
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<CreatedEmployeeResponse>>> {
  // Auth: hanya admin / super_admin yang boleh menambah karyawan.
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const appUserRows = await db
    .select({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    })
    .from(user)
    .where(eq(user.supabase_auth_id, authUser.id))
    .limit(1);

  const appUser = appUserRows[0];
  if (!appUser) {
    return fail(403, "FORBIDDEN", "Akun tidak terdaftar");
  }
  if (appUser.role !== "admin" && appUser.role !== "super_admin") {
    return fail(403, "FORBIDDEN", "Anda tidak memiliki akses untuk menambah karyawan");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_BODY", "Body request tidak valid");
  }

  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: first?.message ?? "Data tidak valid",
          details: { issues: parsed.error.issues },
        },
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    // Cek NIP unik.
    const existingNip = await db
      .select({ id: employee.id })
      .from(employee)
      .where(eq(employee.nip, data.nip))
      .limit(1);
    if (existingNip.length > 0) {
      return fail(409, "NIP_TAKEN", "NIP sudah terdaftar");
    }

    // Cek NIK unik (jika diisi).
    if (data.nik) {
      const existingNik = await db
        .select({ id: employee.id })
        .from(employee)
        .where(eq(employee.nik, data.nik))
        .limit(1);
      if (existingNik.length > 0) {
        return fail(409, "NIK_TAKEN", "NIK sudah terdaftar");
      }
    }

    // Cek email unik (jika diisi).
    if (data.email) {
      const existingEmail = await db
        .select({ id: employee.id })
        .from(employee)
        .where(eq(employee.email, data.email))
        .limit(1);
      if (existingEmail.length > 0) {
        return fail(409, "EMAIL_TAKEN", "Email sudah terdaftar");
      }
    }

    const inserted = await db
      .insert(employee)
      .values({
        nip: data.nip,
        nik: data.nik,
        nama_lengkap: data.nama_lengkap,
        jenis_kelamin: data.jenis_kelamin,
        tempat_lahir: data.tempat_lahir,
        tanggal_lahir: data.tanggal_lahir,
        alamat: data.alamat,
        kota_domisili: data.kota_domisili,
        handphone: data.handphone,
        email: data.email,
        status_pegawai: data.status_pegawai,
        status_kontrak: data.status_kontrak,
        status_kerja: data.status_kerja,
        provider: data.provider,
        kode_organisasi: data.kode_organisasi,
        unit_organisasi: data.unit_organisasi,
        nama_organisasi: data.nama_organisasi,
        sub_unit_organisasi: data.sub_unit_organisasi,
        unit_id: data.unit_id,
        sub_unit_id: data.sub_unit_id,
        nama_jabatan: data.nama_jabatan,
        jabatan: data.jabatan,
        kelompok_jabatan: data.kelompok_jabatan,
        kelas_jabatan: data.kelas_jabatan,
        unit_kerja_kontrak: data.unit_kerja_kontrak,
        grade: data.grade,
        kategori_karyawan: data.kategori_karyawan,
        tmt_mulai_kerja: data.tmt_mulai_kerja,
        tmt_berakhir_kerja: data.tmt_berakhir_kerja,
        tmt_mulai_jabatan: data.tmt_mulai_jabatan,
        tmt_akhir_jabatan: data.tmt_akhir_jabatan,
        tmt_berakhir_jabatan: data.tmt_berakhir_jabatan,
        tmt_pensiun: data.tmt_pensiun,
        pendidikan: data.pendidikan,
        pendidikan_terakhir: data.pendidikan_terakhir,
        instansi_pendidikan: data.instansi_pendidikan,
        jurusan: data.jurusan,
        remarks_pendidikan: data.remarks_pendidikan,
        tahun_lulus: data.tahun_lulus,
        no_bpjs_kesehatan: data.no_bpjs_kesehatan,
        no_bpjs_ketenagakerjaan: data.no_bpjs_ketenagakerjaan,
        height: data.height,
        weight: data.weight,
        jenis_sepatu: data.jenis_sepatu,
        ukuran_sepatu: data.ukuran_sepatu,
        seragam: data.seragam,
      })
      .returning({
        id: employee.id,
        nip: employee.nip,
        nama_lengkap: employee.nama_lengkap,
      });

    const created = inserted[0];
    if (!created) {
      return fail(500, "INTERNAL_ERROR", "Gagal menambah karyawan");
    }

    // Activity log — non-fatal jika gagal.
    try {
      await db.insert(activityLog).values({
        user_id: appUser.id,
        user_email: appUser.email,
        user_name: appUser.full_name,
        activity: "create_employee",
        description: `${appUser.full_name} menambah karyawan ${created.nama_lengkap} (${created.nip})`,
        target_type: "employee",
        target_label: created.nama_lengkap,
        ip_address: request.headers.get("x-forwarded-for") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (err) {
      logger.error("Failed to log create_employee activity", err);
    }

    return NextResponse.json<ApiResponse<CreatedEmployeeResponse>>({
      success: true,
      data: { employee: created },
    });
  } catch (err) {
    logger.error("Failed to create employee", err);
    return fail(500, "INTERNAL_ERROR", "Gagal menambah karyawan");
  }
}
