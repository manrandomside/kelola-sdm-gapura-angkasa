import { NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, employee, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { updateEmployeeSchema } from "@/lib/validations/employee";

import type { ApiResponse } from "@/types/api";

interface EmployeeDetail {
  id: number;
  no: number | null;
  nip: string;
  nik: string | null;
  nama_lengkap: string;
  jenis_kelamin: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  usia: number | null;
  alamat: string | null;
  kota_domisili: string | null;
  handphone: string | null;
  email: string | null;
  status_pegawai: string | null;
  status_kontrak: string | null;
  status_kerja: string | null;
  provider: string | null;
  lokasi_kerja: string | null;
  cabang: string | null;
  kode_organisasi: string | null;
  unit_organisasi: string | null;
  nama_organisasi: string | null;
  sub_unit_organisasi: string | null;
  unit_id: number | null;
  sub_unit_id: number | null;
  nama_jabatan: string | null;
  jabatan: string | null;
  kelompok_jabatan: string | null;
  kelas_jabatan: string | null;
  unit_kerja_kontrak: string | null;
  grade: string | null;
  kategori_karyawan: string | null;
  tmt_mulai_kerja: string | null;
  tmt_berakhir_kerja: string | null;
  tmt_mulai_jabatan: string | null;
  tmt_akhir_jabatan: string | null;
  tmt_berakhir_jabatan: string | null;
  tmt_pensiun: string | null;
  masa_kerja: string | null;
  masa_kerja_bulan: string | null;
  masa_kerja_tahun: string | null;
  pendidikan: string | null;
  pendidikan_terakhir: string | null;
  instansi_pendidikan: string | null;
  jurusan: string | null;
  remarks_pendidikan: string | null;
  tahun_lulus: number | null;
  no_bpjs_kesehatan: string | null;
  no_bpjs_ketenagakerjaan: string | null;
  height: number | null;
  weight: number | null;
  jenis_sepatu: string | null;
  ukuran_sepatu: string | null;
  seragam: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeDetailResponse {
  employee: EmployeeDetail;
}

interface UpdatedEmployeeResponse {
  employee: { id: number; nip: string; nama_lengkap: string };
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

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<EmployeeDetailResponse>>> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return fail(401, "UNAUTHORIZED", "Sesi tidak valid");
  }

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) {
    return fail(400, "INVALID_ID", "ID karyawan tidak valid");
  }

  try {
    const rows = await db
      .select()
      .from(employee)
      .where(eq(employee.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return fail(404, "NOT_FOUND", "Data karyawan tidak ditemukan");
    }

    const detail: EmployeeDetail = {
      id: row.id,
      no: row.no,
      nip: row.nip,
      nik: row.nik,
      nama_lengkap: row.nama_lengkap,
      jenis_kelamin: row.jenis_kelamin,
      tempat_lahir: row.tempat_lahir,
      tanggal_lahir: row.tanggal_lahir,
      usia: row.usia,
      alamat: row.alamat,
      kota_domisili: row.kota_domisili,
      handphone: row.handphone,
      email: row.email,
      status_pegawai: row.status_pegawai,
      status_kontrak: row.status_kontrak,
      status_kerja: row.status_kerja,
      provider: row.provider,
      lokasi_kerja: row.lokasi_kerja,
      cabang: row.cabang,
      kode_organisasi: row.kode_organisasi,
      unit_organisasi: row.unit_organisasi,
      nama_organisasi: row.nama_organisasi,
      sub_unit_organisasi: row.sub_unit_organisasi,
      unit_id: row.unit_id,
      sub_unit_id: row.sub_unit_id,
      nama_jabatan: row.nama_jabatan,
      jabatan: row.jabatan,
      kelompok_jabatan: row.kelompok_jabatan,
      kelas_jabatan: row.kelas_jabatan,
      unit_kerja_kontrak: row.unit_kerja_kontrak,
      grade: row.grade,
      kategori_karyawan: row.kategori_karyawan,
      tmt_mulai_kerja: row.tmt_mulai_kerja,
      tmt_berakhir_kerja: row.tmt_berakhir_kerja,
      tmt_mulai_jabatan: row.tmt_mulai_jabatan,
      tmt_akhir_jabatan: row.tmt_akhir_jabatan,
      tmt_berakhir_jabatan: row.tmt_berakhir_jabatan,
      tmt_pensiun: row.tmt_pensiun,
      masa_kerja: row.masa_kerja,
      masa_kerja_bulan: row.masa_kerja_bulan,
      masa_kerja_tahun: row.masa_kerja_tahun,
      pendidikan: row.pendidikan,
      pendidikan_terakhir: row.pendidikan_terakhir,
      instansi_pendidikan: row.instansi_pendidikan,
      jurusan: row.jurusan,
      remarks_pendidikan: row.remarks_pendidikan,
      tahun_lulus: row.tahun_lulus,
      no_bpjs_kesehatan: row.no_bpjs_kesehatan,
      no_bpjs_ketenagakerjaan: row.no_bpjs_ketenagakerjaan,
      height: row.height,
      weight: row.weight,
      jenis_sepatu: row.jenis_sepatu,
      ukuran_sepatu: row.ukuran_sepatu,
      seragam: row.seragam,
      status: row.status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };

    return NextResponse.json<ApiResponse<EmployeeDetailResponse>>({
      success: true,
      data: { employee: detail },
    });
  } catch (err) {
    logger.error("Failed to fetch employee detail", err);
    return fail(500, "INTERNAL_ERROR", "Gagal mengambil data karyawan");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<UpdatedEmployeeResponse>>> {
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
    return fail(
      403,
      "FORBIDDEN",
      "Anda tidak memiliki akses untuk mengubah karyawan",
    );
  }

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) {
    return fail(400, "INVALID_ID", "ID karyawan tidak valid");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_BODY", "Body request tidak valid");
  }

  const parsed = updateEmployeeSchema.safeParse(body);
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
    // Pastikan karyawan ada.
    const existingRows = await db
      .select()
      .from(employee)
      .where(eq(employee.id, id))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      return fail(404, "NOT_FOUND", "Data karyawan tidak ditemukan");
    }

    // Cek NIP unik (exclude current id).
    const nipConflict = await db
      .select({ id: employee.id })
      .from(employee)
      .where(and(eq(employee.nip, data.nip), ne(employee.id, id)))
      .limit(1);
    if (nipConflict.length > 0) {
      return fail(409, "NIP_TAKEN", "NIP sudah terdaftar");
    }

    // Cek NIK unik (exclude current id).
    if (data.nik) {
      const nikConflict = await db
        .select({ id: employee.id })
        .from(employee)
        .where(and(eq(employee.nik, data.nik), ne(employee.id, id)))
        .limit(1);
      if (nikConflict.length > 0) {
        return fail(409, "NIK_TAKEN", "NIK sudah terdaftar");
      }
    }

    // Cek email unik (exclude current id).
    if (data.email) {
      const emailConflict = await db
        .select({ id: employee.id })
        .from(employee)
        .where(and(eq(employee.email, data.email), ne(employee.id, id)))
        .limit(1);
      if (emailConflict.length > 0) {
        return fail(409, "EMAIL_TAKEN", "Email sudah terdaftar");
      }
    }

    // Hitung field yang berubah untuk activity log metadata.
    const trackedFields: Array<keyof typeof data> = [
      "nip",
      "nik",
      "nama_lengkap",
      "jenis_kelamin",
      "tempat_lahir",
      "tanggal_lahir",
      "alamat",
      "kota_domisili",
      "handphone",
      "email",
      "status_pegawai",
      "status_kontrak",
      "status_kerja",
      "provider",
      "kode_organisasi",
      "unit_organisasi",
      "nama_organisasi",
      "sub_unit_organisasi",
      "unit_id",
      "sub_unit_id",
      "nama_jabatan",
      "jabatan",
      "kelompok_jabatan",
      "kelas_jabatan",
      "unit_kerja_kontrak",
      "grade",
      "kategori_karyawan",
      "tmt_mulai_kerja",
      "tmt_berakhir_kerja",
      "tmt_mulai_jabatan",
      "tmt_akhir_jabatan",
      "tmt_berakhir_jabatan",
      "tmt_pensiun",
      "pendidikan",
      "pendidikan_terakhir",
      "instansi_pendidikan",
      "jurusan",
      "remarks_pendidikan",
      "tahun_lulus",
      "no_bpjs_kesehatan",
      "no_bpjs_ketenagakerjaan",
      "height",
      "weight",
      "jenis_sepatu",
      "ukuran_sepatu",
      "seragam",
    ];
    const changedFields: string[] = [];
    for (const key of trackedFields) {
      const before = (existing as Record<string, unknown>)[key];
      const after = (data as Record<string, unknown>)[key];
      const beforeNorm = before == null ? null : before;
      const afterNorm = after == null ? null : after;
      if (beforeNorm !== afterNorm) {
        changedFields.push(key);
      }
    }

    const updated = await db
      .update(employee)
      .set({
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
        updated_at: sql`NOW()`,
      })
      .where(eq(employee.id, id))
      .returning({
        id: employee.id,
        nip: employee.nip,
        nama_lengkap: employee.nama_lengkap,
      });

    const result = updated[0];
    if (!result) {
      return fail(500, "INTERNAL_ERROR", "Gagal mengubah karyawan");
    }

    // Activity log — non-fatal.
    try {
      await db.insert(activityLog).values({
        user_id: appUser.id,
        user_email: appUser.email,
        user_name: appUser.full_name,
        activity: "update_employee",
        description: `${appUser.full_name} mengubah data karyawan ${result.nama_lengkap} (${result.nip})`,
        target_type: "employee",
        target_label: result.nama_lengkap,
        metadata: { changed_fields: changedFields },
        ip_address: request.headers.get("x-forwarded-for") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (err) {
      logger.error("Failed to log update_employee activity", err);
    }

    return NextResponse.json<ApiResponse<UpdatedEmployeeResponse>>({
      success: true,
      data: { employee: result },
    });
  } catch (err) {
    logger.error("Failed to update employee", err);
    return fail(500, "INTERNAL_ERROR", "Gagal mengubah karyawan");
  }
}
