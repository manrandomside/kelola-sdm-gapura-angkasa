import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, employee, importLog } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { KODE_ORGANISASI_MAP, STATUS_KONTRAK_TO_PEGAWAI } from "@/lib/constants/enums";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import { createUserAccount } from "@/lib/utils/create-user-account";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";
import type { NormalizedRow } from "@/lib/utils/excel";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 50;

interface ExecuteBatchRow {
  rowNumber: number;
  data: NormalizedRow;
  isExistingNip?: boolean;
}

interface ExecuteBatchRequestBody {
  rows: ExecuteBatchRow[];
  batchIndex: number;
  totalBatches: number;
  importLogId?: string;
  fileName: string;
}

interface BatchError {
  row: number;
  field: string;
  message: string;
  value: string;
}

interface ExecuteBatchResponseData {
  importLogId: string;
  batchIndex: number;
  batchSuccess: number;
  batchErrors: number;
  batchSkipped: number;
  errors: BatchError[];
  newAccounts: number;
  updatedRecords: number;
  insertedRecords: number;
}

// Rollback metadata stored per import_log
interface ImportMetadata {
  insertedIds: number[];
  updatedRecords: { id: number; oldData: Record<string, unknown> }[];
  columnMapping?: Record<string, string>;
  errors: BatchError[];
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

function buildEmployeeValues(data: NormalizedRow) {
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
    status_pegawai: data.status_kontrak
      ? (STATUS_KONTRAK_TO_PEGAWAI[data.status_kontrak] ?? data.status_pegawai)
      : data.status_pegawai,
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
): Promise<NextResponse<ApiResponse<ExecuteBatchResponseData>>> {
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
  if (appUser.role !== "admin" && appUser.role !== "super_admin") {
    return fail(403, "FORBIDDEN", "Anda tidak memiliki akses untuk import data");
  }

  const importProviderScope = getProviderFilter(appUser);

  let body: ExecuteBatchRequestBody;
  try {
    body = (await request.json()) as ExecuteBatchRequestBody;
  } catch {
    return fail(400, "INVALID_BODY", "Body request tidak valid");
  }

  if (!body || !Array.isArray(body.rows) || body.rows.length === 0) {
    return fail(400, "NO_ROWS", "Tidak ada baris data untuk diimport");
  }
  if (body.rows.length > MAX_BATCH_SIZE) {
    return fail(400, "BATCH_TOO_LARGE", `Maksimal ${MAX_BATCH_SIZE} baris per batch`);
  }
  if (!body.fileName || typeof body.fileName !== "string") {
    return fail(400, "FILE_NAME_REQUIRED", "Nama file tidak valid");
  }
  if (typeof body.batchIndex !== "number" || typeof body.totalBatches !== "number") {
    return fail(400, "INVALID_BATCH_INFO", "Info batch tidak valid");
  }

  let importLogId: string;

  // First batch: create import_log
  if (body.batchIndex === 0) {
    try {
      const inserted = await db
        .insert(importLog)
        .values({
          user_id: appUser.id,
          file_name: body.fileName,
          total_rows: 0,
          success_count: 0,
          error_count: 0,
          skipped_count: 0,
          status: "processing",
          started_at: new Date(),
          metadata: { insertedIds: [], updatedRecords: [], errors: [] },
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
  } else {
    // Subsequent batches: use existing importLogId
    if (!body.importLogId) {
      return fail(400, "IMPORT_LOG_ID_REQUIRED", "Import log ID diperlukan untuk batch selanjutnya");
    }
    importLogId = body.importLogId;

    // Verify import_log exists and is still processing
    const existing = await db
      .select({ id: importLog.id, status: importLog.status })
      .from(importLog)
      .where(eq(importLog.id, importLogId))
      .limit(1);
    if (existing.length === 0) {
      return fail(404, "IMPORT_LOG_NOT_FOUND", "Import log tidak ditemukan");
    }
    if (existing[0]!.status !== "processing") {
      return fail(400, "IMPORT_NOT_PROCESSING", "Import sudah selesai atau dibatalkan");
    }
  }

  const errors: BatchError[] = [];
  let batchSuccess = 0;
  let batchSkipped = 0;
  let newAccounts = 0;
  let updatedRecords = 0;
  let insertedRecords = 0;

  const batchInsertedIds: number[] = [];
  const batchUpdatedRecords: { id: number; oldData: Record<string, unknown> }[] = [];

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    if (!row || !row.data) {
      errors.push({
        row: row?.rowNumber ?? i + 1,
        field: "",
        message: "Struktur row tidak valid",
        value: "",
      });
      continue;
    }

    const data = row.data;
    const nip = data.nip;
    const namaLengkap = data.nama_lengkap;

    if (!nip || !namaLengkap) {
      errors.push({
        row: row.rowNumber,
        field: !nip ? "nip" : "nama_lengkap",
        message: "NIP dan Nama Lengkap wajib diisi",
        value: "",
      });
      continue;
    }

    try {
      const existingEmp = await db
        .select()
        .from(employee)
        .where(eq(employee.nip, nip))
        .limit(1);

      const values = buildEmployeeValues(data);

      if (importProviderScope) {
        values.provider = importProviderScope;
      }

      if (existingEmp.length > 0) {
        // UPDATE — save old data for rollback
        const existingRecord = existingEmp[0]!;
        const oldData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(existingRecord)) {
          if (key !== "created_at" && key !== "updated_at") {
            oldData[key] = value;
          }
        }

        const updatePayload = buildUpdatePayload(values);
        await db
          .update(employee)
          .set(updatePayload)
          .where(eq(employee.id, existingRecord.id));

        batchUpdatedRecords.push({ id: existingRecord.id, oldData });
        updatedRecords += 1;
        batchSuccess += 1;
      } else {
        // INSERT + auto-create user account
        const insertedEmp = await db
          .insert(employee)
          .values(values)
          .returning({ id: employee.id });
        const newEmp = insertedEmp[0];
        if (!newEmp) {
          throw new Error("Insert employee mengembalikan hasil kosong");
        }

        batchInsertedIds.push(newEmp.id);
        insertedRecords += 1;

        const accountResult = await createUserAccount({
          nip,
          namaLengkap,
          employeeId: newEmp.id,
        });
        if (!accountResult.success) {
          throw new Error(accountResult.error ?? "Gagal membuat akun auth");
        }
        if (!accountResult.skipped) {
          newAccounts += 1;
        }

        batchSuccess += 1;
      }
    } catch (err) {
      logger.error(`Failed to import row ${row.rowNumber} (NIP ${nip})`, err);
      errors.push({
        row: row.rowNumber,
        field: "",
        message: extractErrorMessage(err),
        value: nip,
      });
    }
  }

  // Update import_log with batch results
  const isLastBatch = body.batchIndex === body.totalBatches - 1;

  try {
    // Append to metadata (insertedIds, updatedRecords, errors)
    await db
      .update(importLog)
      .set({
        total_rows: sql`${importLog.total_rows} + ${body.rows.length}`,
        success_count: sql`${importLog.success_count} + ${batchSuccess}`,
        error_count: sql`${importLog.error_count} + ${errors.length}`,
        skipped_count: sql`${importLog.skipped_count} + ${batchSkipped}`,
        ...(errors.length > 0
          ? {
              error_details: sql`COALESCE(${importLog.error_details}, '[]'::jsonb) || ${JSON.stringify(errors)}::jsonb`,
            }
          : {}),
        metadata: sql`jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(${importLog.metadata}, '{"insertedIds":[],"updatedRecords":[],"errors":[]}'::jsonb),
              '{insertedIds}',
              COALESCE(${importLog.metadata}->'insertedIds', '[]'::jsonb) || ${JSON.stringify(batchInsertedIds)}::jsonb
            ),
            '{updatedRecords}',
            COALESCE(${importLog.metadata}->'updatedRecords', '[]'::jsonb) || ${JSON.stringify(batchUpdatedRecords)}::jsonb
          ),
          '{errors}',
          COALESCE(${importLog.metadata}->'errors', '[]'::jsonb) || ${JSON.stringify(errors)}::jsonb
        )`,
        ...(isLastBatch
          ? {
              status: errors.length > 0 && batchSuccess === 0 ? "failed" : "completed",
              completed_at: new Date(),
            }
          : {}),
      })
      .where(eq(importLog.id, importLogId));
  } catch (err) {
    logger.error("Failed to update import_log record", err);
  }

  // Activity log on last batch
  if (isLastBatch) {
    try {
      await db.insert(activityLog).values({
        user_id: appUser.id,
        user_email: appUser.email,
        user_name: appUser.fullName,
        activity: "import_excel",
        description: `${appUser.fullName} mengimport data karyawan dari ${body.fileName} (batch ${body.totalBatches} batch)`,
        target_type: "import_log",
        target_id: importLogId,
        target_label: body.fileName,
        metadata: {
          file_name: body.fileName,
          total_batches: body.totalBatches,
          import_log_id: importLogId,
        },
        ip_address: request.headers.get("x-forwarded-for") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (err) {
      logger.error("Failed to log import_excel activity", err);
    }
  }

  return NextResponse.json<ApiResponse<ExecuteBatchResponseData>>({
    success: true,
    data: {
      importLogId,
      batchIndex: body.batchIndex,
      batchSuccess,
      batchErrors: errors.length,
      batchSkipped,
      errors,
      newAccounts,
      updatedRecords,
      insertedRecords,
    },
  });
}
