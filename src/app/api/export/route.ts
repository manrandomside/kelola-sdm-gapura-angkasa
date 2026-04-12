import { NextResponse } from "next/server";
import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, employee, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import {
  generateExportExcel,
  type ExportColumnSet,
  type ExportEmployeeRecord,
} from "@/lib/utils/excel";
import { logger } from "@/lib/utils/logger";
import { formatDateWITA } from "@/lib/utils/date";

import type { ApiResponse } from "@/types/api";

// Export 1414 baris bisa butuh waktu beberapa detik — naikkan maxDuration
// untuk jaga-jaga saat deploy ke Vercel.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface ExportFilterBody {
  search?: string | null;
  status_pegawai?: string | null;
  status_kontrak?: string | null;
  unit_organisasi?: string | null;
  provider?: string | null;
  status_kerja?: string | null;
}

interface ExportRequestBody {
  filter?: ExportFilterBody;
  columns?: ExportColumnSet;
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

export async function POST(request: Request): Promise<NextResponse> {
  // Auth: semua role (termasuk staff) boleh export.
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const appUser = await getSessionUser(authUser.id);
  if (!appUser) {
    return fail(403, "FORBIDDEN", "Akun tidak terdaftar");
  }

  const exportProviderScope = getProviderFilter(appUser);

  let body: ExportRequestBody;
  try {
    body = (await request.json()) as ExportRequestBody;
  } catch {
    body = {};
  }

  const filter = body.filter ?? {};
  const columnSet: ExportColumnSet = body.columns === "basic" ? "basic" : "all";

  // Build WHERE conditions sama persis seperti GET /api/employees — termasuk
  // filter status = 'active' agar soft-deleted tidak ikut ter-export.
  const conditions: SQL[] = [eq(employee.status, "active")];

  // Provider-scoped super admins can only export their own provider's employees.
  if (exportProviderScope) {
    conditions.push(eq(employee.provider, exportProviderScope));
  }

  const search = filter.search?.trim() ?? "";
  if (search.length > 0) {
    const pattern = `%${search}%`;
    const searchCondition = or(
      ilike(employee.nama_lengkap, pattern),
      ilike(employee.nip, pattern),
      ilike(employee.nik, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (filter.status_pegawai) {
    conditions.push(eq(employee.status_pegawai, filter.status_pegawai));
  }
  if (filter.status_kontrak) {
    conditions.push(eq(employee.status_kontrak, filter.status_kontrak));
  }
  if (filter.unit_organisasi) {
    conditions.push(eq(employee.unit_organisasi, filter.unit_organisasi));
  }
  if (filter.provider) {
    conditions.push(eq(employee.provider, filter.provider));
  }
  if (filter.status_kerja) {
    conditions.push(eq(employee.status_kerja, filter.status_kerja));
  }

  const whereClause = and(...conditions);

  try {
    const rows = await db
      .select({
        nip: employee.nip,
        nik: employee.nik,
        nama_lengkap: employee.nama_lengkap,
        lokasi_kerja: employee.lokasi_kerja,
        cabang: employee.cabang,
        status_pegawai: employee.status_pegawai,
        status_kontrak: employee.status_kontrak,
        status_kerja: employee.status_kerja,
        provider: employee.provider,
        unit_organisasi: employee.unit_organisasi,
        kode_organisasi: employee.kode_organisasi,
        nama_organisasi: employee.nama_organisasi,
        sub_unit_organisasi: employee.sub_unit_organisasi,
        nama_jabatan: employee.nama_jabatan,
        unit_kerja_kontrak: employee.unit_kerja_kontrak,
        tmt_mulai_kerja: employee.tmt_mulai_kerja,
        tmt_mulai_jabatan: employee.tmt_mulai_jabatan,
        tmt_berakhir_jabatan: employee.tmt_berakhir_jabatan,
        tmt_berakhir_kerja: employee.tmt_berakhir_kerja,
        masa_kerja_bulan: employee.masa_kerja_bulan,
        masa_kerja_tahun: employee.masa_kerja_tahun,
        jenis_kelamin: employee.jenis_kelamin,
        jenis_sepatu: employee.jenis_sepatu,
        ukuran_sepatu: employee.ukuran_sepatu,
        tempat_lahir: employee.tempat_lahir,
        tanggal_lahir: employee.tanggal_lahir,
        usia: employee.usia,
        kota_domisili: employee.kota_domisili,
        alamat: employee.alamat,
        pendidikan: employee.pendidikan,
        instansi_pendidikan: employee.instansi_pendidikan,
        jurusan: employee.jurusan,
        remarks_pendidikan: employee.remarks_pendidikan,
        tahun_lulus: employee.tahun_lulus,
        handphone: employee.handphone,
        email: employee.email,
        kategori_karyawan: employee.kategori_karyawan,
        tmt_pensiun: employee.tmt_pensiun,
        grade: employee.grade,
        no_bpjs_kesehatan: employee.no_bpjs_kesehatan,
        no_bpjs_ketenagakerjaan: employee.no_bpjs_ketenagakerjaan,
        kelompok_jabatan: employee.kelompok_jabatan,
        kelas_jabatan: employee.kelas_jabatan,
        weight: employee.weight,
        height: employee.height,
        no: employee.no,
      })
      .from(employee)
      .where(whereClause)
      .orderBy(asc(employee.no), asc(employee.nama_lengkap));

    // Strip property `no` — nomor urut pada file export dibuat 1..N
    // berdasarkan urutan baris, bukan dari kolom `no` di database.
    const records: ExportEmployeeRecord[] = rows.map(({ no: _no, ...rest }) => {
      void _no;
      return rest;
    });

    const buffer = generateExportExcel(records, { columns: columnSet });

    const dateStamp = formatDateWITA(new Date(), "yyyy-MM-dd");
    const fileName = `SDM_GapuraAngkasa_${dateStamp}.xlsx`;

    // Activity log — non-fatal.
    try {
      await db.insert(activityLog).values({
        user_id: appUser.id,
        user_email: appUser.email,
        user_name: appUser.fullName,
        activity: "export_excel",
        description: `${appUser.fullName} mengexport ${records.length} data karyawan`,
        target_type: "employee",
        target_label: fileName,
        metadata: {
          filter,
          columns: columnSet,
          total_rows: records.length,
        },
        ip_address: request.headers.get("x-forwarded-for") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (err) {
      logger.error("Failed to log export_excel activity", err);
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("Failed to export employees", err);
    return fail(500, "INTERNAL_ERROR", "Gagal mengexport data karyawan");
  }
}
