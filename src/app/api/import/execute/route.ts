import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, employee, importLog, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { KODE_ORGANISASI_MAP } from "@/lib/constants/enums";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";
import type { NormalizedRow } from "@/lib/utils/excel";

// Next.js route config — import 1414 row butuh waktu lama.
// maxDuration hanya efektif di Vercel; di dev tidak ada limit.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface ExecuteRequestRow {
  rowNumber: number;
  data: NormalizedRow;
  isExistingNip?: boolean;
}

interface ExecuteRequestBody {
  rows: ExecuteRequestRow[];
  fileName: string;
}

interface ImportRowError {
  rowNumber: number;
  nip: string | null;
  nama_lengkap: string | null;
  error: string;
}

interface ExecuteResponseData {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  accountsCreated: number;
  accountsSkipped: number;
  errors: ImportRowError[];
  importLogId: string;
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

// Buat email internal yang stabil dari NIP. Karyawan tidak memiliki email
// real yang wajib diisi di CSV, jadi kita pakai {nip}@gapura.internal.
function buildInternalEmail(nip: string): string {
  return `${nip.trim().toLowerCase()}@gapura.internal`;
}

// Strip out properti NormalizedRow yang tidak relevan untuk tabel employee
// (sebagian besar mapping 1:1; `no` diabaikan untuk update karena bukan PK).
function buildEmployeeValues(data: NormalizedRow) {
  // Derive nama_organisasi dari kode_organisasi jika kode ada tapi nama kosong.
  let nama_organisasi = data.nama_organisasi;
  if (!nama_organisasi && data.kode_organisasi) {
    const mapped =
      KODE_ORGANISASI_MAP[
        data.kode_organisasi as keyof typeof KODE_ORGANISASI_MAP
      ];
    if (mapped) nama_organisasi = mapped;
  }

  return {
    no: data.no,
    nip: data.nip ?? "",
    nik: data.nik,
    nama_lengkap: data.nama_lengkap ?? "",
    jenis_kelamin: data.jenis_kelamin,
    tempat_lahir: data.tempat_lahir,
    tanggal_lahir: data.tanggal_lahir,
    usia: data.usia,
    alamat: data.alamat,
    kota_domisili: data.kota_domisili,
    handphone: data.handphone,
    email: data.email,
    status_pegawai: data.status_pegawai,
    status_kontrak: data.status_kontrak,
    status_kerja: data.status_kerja,
    provider: data.provider,
    lokasi_kerja: data.lokasi_kerja ?? "Bandar Udara Ngurah Rai",
    cabang: data.cabang ?? "DPS",
    kode_organisasi: data.kode_organisasi,
    unit_organisasi: data.unit_organisasi,
    nama_organisasi,
    sub_unit_organisasi: data.sub_unit_organisasi,
    nama_jabatan: data.nama_jabatan,
    unit_kerja_kontrak: data.unit_kerja_kontrak,
    tmt_mulai_kerja: data.tmt_mulai_kerja,
    tmt_berakhir_kerja: data.tmt_berakhir_kerja,
    tmt_mulai_jabatan: data.tmt_mulai_jabatan,
    tmt_berakhir_jabatan: data.tmt_berakhir_jabatan,
    tmt_pensiun: data.tmt_pensiun,
    masa_kerja_bulan: data.masa_kerja_bulan,
    masa_kerja_tahun: data.masa_kerja_tahun,
    pendidikan: data.pendidikan,
    instansi_pendidikan: data.instansi_pendidikan,
    jurusan: data.jurusan,
    remarks_pendidikan: data.remarks_pendidikan,
    tahun_lulus: data.tahun_lulus,
    kategori_karyawan: data.kategori_karyawan,
    grade: data.grade,
    no_bpjs_kesehatan: data.no_bpjs_kesehatan,
    no_bpjs_ketenagakerjaan: data.no_bpjs_ketenagakerjaan,
    kelompok_jabatan: data.kelompok_jabatan,
    kelas_jabatan: data.kelas_jabatan,
    jenis_sepatu: data.jenis_sepatu,
    ukuran_sepatu: data.ukuran_sepatu,
    height: data.height,
    weight: data.weight,
  };
}

// Untuk UPDATE: hanya field yang tidak null yang di-overwrite, agar data
// existing tidak tertimpa oleh nilai kosong dari file import baru. NIP dan
// nama_lengkap tetap di-update karena sudah divalidasi wajib di preview.
function buildUpdatePayload(
  values: ReturnType<typeof buildEmployeeValues>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { updated_at: new Date() };
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined) {
      payload[key] = value;
    }
  }
  return payload;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Kesalahan tidak diketahui";
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<ExecuteResponseData>>> {
  // Auth: hanya admin / super_admin yang boleh import.
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
      "Anda tidak memiliki akses untuk import data",
    );
  }

  let body: ExecuteRequestBody;
  try {
    body = (await request.json()) as ExecuteRequestBody;
  } catch {
    return fail(400, "INVALID_BODY", "Body request tidak valid");
  }

  if (!body || !Array.isArray(body.rows) || body.rows.length === 0) {
    return fail(400, "NO_ROWS", "Tidak ada baris data untuk diimport");
  }
  if (!body.fileName || typeof body.fileName !== "string") {
    return fail(400, "FILE_NAME_REQUIRED", "Nama file tidak valid");
  }

  const startedAt = new Date();
  const supabaseAdmin = createSupabaseAdminClient();

  // Inisialisasi record import_log di awal agar kita punya ID untuk referensi
  // kalau terjadi error fatal di tengah proses.
  let importLogId: string;
  try {
    const inserted = await db
      .insert(importLog)
      .values({
        user_id: appUser.id,
        file_name: body.fileName,
        total_rows: body.rows.length,
        success_count: 0,
        error_count: 0,
        skipped_count: 0,
        status: "processing",
        started_at: startedAt,
      })
      .returning({ id: importLog.id });
    const logRow = inserted[0];
    if (!logRow) {
      return fail(500, "INTERNAL_ERROR", "Gagal membuat record import log");
    }
    importLogId = logRow.id;
  } catch (err) {
    logger.error("Failed to create import_log record", err);
    return fail(500, "INTERNAL_ERROR", "Gagal membuat record import log");
  }

  const errors: ImportRowError[] = [];
  let successCount = 0;
  let accountsCreated = 0;
  let accountsSkipped = 0;

  // Proses row satu per satu. Error pada satu row tidak menghentikan proses.
  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    if (!row || !row.data) {
      errors.push({
        rowNumber: row?.rowNumber ?? i + 1,
        nip: null,
        nama_lengkap: null,
        error: "Struktur row tidak valid",
      });
      continue;
    }

    const data = row.data;
    const nip = data.nip;
    const namaLengkap = data.nama_lengkap;

    if (!nip || !namaLengkap) {
      errors.push({
        rowNumber: row.rowNumber,
        nip: nip ?? null,
        nama_lengkap: namaLengkap ?? null,
        error: "NIP dan Nama Lengkap wajib diisi",
      });
      continue;
    }

    try {
      // Re-check NIP existence di DB — jangan andalkan flag dari preview.
      const existingEmp = await db
        .select({ id: employee.id })
        .from(employee)
        .where(eq(employee.nip, nip))
        .limit(1);

      const values = buildEmployeeValues(data);

      if (existingEmp.length > 0) {
        // UPDATE — hanya field non-null.
        const existingId = existingEmp[0]!.id;
        const updatePayload = buildUpdatePayload(values);
        // Jangan overwrite nip (sudah sama) tapi biarkan; ini aman.
        await db
          .update(employee)
          .set(updatePayload)
          .where(eq(employee.id, existingId));
        successCount += 1;
      } else {
        // INSERT + auto-create user account.
        const insertedEmp = await db
          .insert(employee)
          .values(values)
          .returning({ id: employee.id });
        const newEmp = insertedEmp[0];
        if (!newEmp) {
          throw new Error("Insert employee mengembalikan hasil kosong");
        }

        // Cek apakah sudah ada user row untuk NIP ini (mungkin orphan dari
        // import sebelumnya yang gagal di tengah).
        const existingUserRow = await db
          .select({ id: user.id, supabase_auth_id: user.supabase_auth_id })
          .from(user)
          .where(eq(user.nip, nip))
          .limit(1);

        if (existingUserRow.length > 0) {
          // Link user existing ke employee baru.
          await db
            .update(user)
            .set({ employee_id: newEmp.id, updated_at: new Date() })
            .where(eq(user.id, existingUserRow[0]!.id));
          accountsSkipped += 1;
        } else {
          // Create di Supabase Auth. Jika email sudah terpakai, lookup.
          const email = buildInternalEmail(nip);
          let authUserId: string | null = null;

          const createRes = await supabaseAdmin.auth.admin.createUser({
            email,
            password: nip,
            email_confirm: true,
            user_metadata: {
              nip,
              full_name: namaLengkap,
            },
          });

          if (createRes.data.user) {
            authUserId = createRes.data.user.id;
            accountsCreated += 1;
          } else if (createRes.error) {
            // Kemungkinan email sudah terpakai (import ulang). Lookup manual.
            const lookup = await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 1000,
            });
            if (lookup.error) {
              throw new Error(
                `Gagal membuat akun auth: ${createRes.error.message}`,
              );
            }
            const match = lookup.data.users.find((u) => u.email === email);
            if (!match) {
              throw new Error(
                `Gagal membuat akun auth: ${createRes.error.message}`,
              );
            }
            authUserId = match.id;
            accountsSkipped += 1;
          }

          if (!authUserId) {
            throw new Error("Auth user id tidak tersedia");
          }

          await db.insert(user).values({
            supabase_auth_id: authUserId,
            nip,
            email,
            full_name: namaLengkap,
            role: "staff",
            status: "active",
            employee_id: newEmp.id,
          });
        }

        successCount += 1;
      }
    } catch (err) {
      logger.error(
        `Failed to import row ${row.rowNumber} (NIP ${nip})`,
        err,
      );
      errors.push({
        rowNumber: row.rowNumber,
        nip,
        nama_lengkap: namaLengkap,
        error: extractErrorMessage(err),
      });
    }
  }

  const completedAt = new Date();
  const errorCount = errors.length;
  const totalProcessed = successCount + errorCount;
  const finalStatus =
    errorCount === 0
      ? "completed"
      : successCount === 0
        ? "failed"
        : "completed";

  // Update record import_log dengan hasil akhir.
  try {
    await db
      .update(importLog)
      .set({
        success_count: successCount,
        error_count: errorCount,
        skipped_count: 0,
        error_details: errors.length > 0 ? errors : null,
        status: finalStatus,
        completed_at: completedAt,
      })
      .where(eq(importLog.id, importLogId));
  } catch (err) {
    logger.error("Failed to finalize import_log record", err);
  }

  // Activity log — non-fatal.
  try {
    await db.insert(activityLog).values({
      user_id: appUser.id,
      user_email: appUser.email,
      user_name: appUser.full_name,
      activity: "import_excel",
      description: `${appUser.full_name} mengimport ${successCount} data karyawan dari ${body.fileName}`,
      target_type: "import_log",
      target_label: body.fileName,
      metadata: {
        file_name: body.fileName,
        total_rows: body.rows.length,
        success_count: successCount,
        error_count: errorCount,
        accounts_created: accountsCreated,
      },
      ip_address: request.headers.get("x-forwarded-for") ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
    });
  } catch (err) {
    logger.error("Failed to log import_excel activity", err);
  }

  return NextResponse.json<ApiResponse<ExecuteResponseData>>({
    success: true,
    data: {
      totalProcessed,
      successCount,
      errorCount,
      accountsCreated,
      accountsSkipped,
      errors,
      importLogId,
    },
  });
}
