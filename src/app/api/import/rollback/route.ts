import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, employee, importLog, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser, isGapuraAdmin } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

export const dynamic = "force-dynamic";

interface RollbackRequestBody {
  importLogId: string;
}

interface RollbackResponseData {
  deletedEmployees: number;
  restoredEmployees: number;
  deletedAccounts: number;
  message: string;
}

interface UpdatedRecord {
  id: number;
  oldData: Record<string, unknown>;
}

interface ImportMetadataShape {
  insertedIds?: number[];
  updatedRecords?: UpdatedRecord[];
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

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Kesalahan tidak diketahui";
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<RollbackResponseData>>> {
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
    return fail(403, "FORBIDDEN", "Anda tidak memiliki akses untuk rollback import");
  }

  let body: RollbackRequestBody;
  try {
    body = (await request.json()) as RollbackRequestBody;
  } catch {
    return fail(400, "INVALID_BODY", "Body request tidak valid");
  }

  if (!body.importLogId) {
    return fail(400, "IMPORT_LOG_ID_REQUIRED", "Import log ID diperlukan");
  }

  // Fetch the import log
  const logRows = await db
    .select()
    .from(importLog)
    .where(eq(importLog.id, body.importLogId))
    .limit(1);

  const logRecord = logRows[0];
  if (!logRecord) {
    return fail(404, "NOT_FOUND", "Import log tidak ditemukan");
  }

  if (logRecord.status !== "completed") {
    return fail(
      400,
      "INVALID_STATUS",
      `Import tidak dapat di-rollback (status: ${logRecord.status}). Hanya import dengan status 'completed' yang bisa di-rollback.`,
    );
  }

  // Ownership check: must be the same user or Gapura super admin
  if (logRecord.user_id !== appUser.id && !isGapuraAdmin(appUser)) {
    return fail(403, "FORBIDDEN", "Anda hanya bisa rollback import milik Anda sendiri");
  }

  const metadata = logRecord.metadata as ImportMetadataShape | null;
  if (!metadata) {
    return fail(
      400,
      "NO_METADATA",
      "Data rollback tidak tersedia untuk import ini. Import mungkin dilakukan sebelum fitur rollback ditambahkan.",
    );
  }

  const insertedIds = metadata.insertedIds ?? [];
  const updatedRecords = metadata.updatedRecords ?? [];

  if (insertedIds.length === 0 && updatedRecords.length === 0) {
    return fail(
      400,
      "NOTHING_TO_ROLLBACK",
      "Tidak ada data yang bisa di-rollback dari import ini",
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  let deletedEmployees = 0;
  let restoredEmployees = 0;
  let deletedAccounts = 0;

  // 1. Delete inserted employees and their auto-created accounts
  if (insertedIds.length > 0) {
    try {
      // Find user accounts linked to these employees
      const linkedUsers = await db
        .select({
          id: user.id,
          supabase_auth_id: user.supabase_auth_id,
          employee_id: user.employee_id,
        })
        .from(user)
        .where(inArray(user.employee_id, insertedIds));

      // Delete auth users from Supabase
      for (const linkedUser of linkedUsers) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(linkedUser.supabase_auth_id);
          deletedAccounts += 1;
        } catch (err) {
          logger.error(`Failed to delete auth user ${linkedUser.supabase_auth_id}`, err);
        }
      }

      // Delete user rows linked to these employees
      if (linkedUsers.length > 0) {
        const userIds = linkedUsers.map((u) => u.id);
        await db.delete(user).where(inArray(user.id, userIds));
      }

      // Delete employees
      await db.delete(employee).where(inArray(employee.id, insertedIds));
      deletedEmployees = insertedIds.length;
    } catch (err) {
      logger.error("Failed to delete inserted employees during rollback", err);
      return fail(500, "ROLLBACK_FAILED", `Gagal menghapus karyawan: ${extractErrorMessage(err)}`);
    }
  }

  // 2. Restore updated employees to their old data
  for (const record of updatedRecords) {
    try {
      const { id: empId, oldData } = record;
      if (!oldData || typeof oldData !== "object") continue;

      // Remove fields that should not be restored
      const restoreData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(oldData)) {
        if (key === "id" || key === "created_at") continue;
        restoreData[key] = value;
      }
      restoreData["updated_at"] = new Date();

      await db
        .update(employee)
        .set(restoreData)
        .where(eq(employee.id, empId));
      restoredEmployees += 1;
    } catch (err) {
      logger.error(`Failed to restore employee ${record.id} during rollback`, err);
    }
  }

  // 3. Update import_log status
  try {
    await db
      .update(importLog)
      .set({ status: "rolled_back" })
      .where(eq(importLog.id, body.importLogId));
  } catch (err) {
    logger.error("Failed to update import_log status to rolled_back", err);
  }

  // 4. Activity log
  try {
    await db.insert(activityLog).values({
      user_id: appUser.id,
      user_email: appUser.email,
      user_name: appUser.fullName,
      activity: "import_excel",
      description: `${appUser.fullName} melakukan rollback import "${logRecord.file_name}" (${deletedEmployees} dihapus, ${restoredEmployees} dikembalikan)`,
      target_type: "import_log",
      target_id: body.importLogId,
      target_label: logRecord.file_name,
      metadata: {
        action: "rollback",
        deleted_employees: deletedEmployees,
        restored_employees: restoredEmployees,
        deleted_accounts: deletedAccounts,
      },
      ip_address: request.headers.get("x-forwarded-for") ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
    });
  } catch (err) {
    logger.error("Failed to log rollback activity", err);
  }

  return NextResponse.json<ApiResponse<RollbackResponseData>>({
    success: true,
    data: {
      deletedEmployees,
      restoredEmployees,
      deletedAccounts,
      message: "Import berhasil di-rollback",
    },
  });
}
