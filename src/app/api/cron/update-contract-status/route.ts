import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, employee, user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

interface ContractDetail {
  nip: string;
  namaLengkap: string;
  tmtBerakhirKerja: string;
}

interface UpdateContractResult {
  updatedCount: number;
  details: ContractDetail[];
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

async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Check Bearer token first (for cron / GitHub Actions).
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Fallback: check if logged-in user is super_admin.
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return false;

    const dbUser = await db.query.user.findFirst({
      where: eq(user.supabase_auth_id, authUser.id),
    });
    return dbUser?.role === "super_admin";
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<UpdateContractResult>>> {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return fail(401, "UNAUTHORIZED", "Akses tidak diizinkan");
  }

  try {
    // Find employees whose contract has expired but status is still Aktif.
    const expiredRows = await db
      .select({
        id: employee.id,
        nip: employee.nip,
        namaLengkap: employee.nama_lengkap,
        tmtBerakhirKerja: employee.tmt_berakhir_kerja,
      })
      .from(employee)
      .where(
        and(
          lt(sql`${employee.tmt_berakhir_kerja}::date`, sql`CURRENT_DATE`),
          eq(employee.status_kerja, "Aktif"),
          eq(employee.status, "active"),
        ),
      );

    if (expiredRows.length === 0) {
      return NextResponse.json<ApiResponse<UpdateContractResult>>({
        success: true,
        data: { updatedCount: 0, details: [] },
      });
    }

    // Update all expired employees to Non Aktif.
    const expiredIds = expiredRows.map((r) => r.id);
    await db
      .update(employee)
      .set({
        status_kerja: "Non Aktif",
        updated_at: new Date(),
      })
      .where(
        sql`${employee.id} = ANY(${sql.raw(`ARRAY[${expiredIds.join(",")}]`)})`,
      );

    const details: ContractDetail[] = expiredRows.map((r) => ({
      nip: r.nip,
      namaLengkap: r.namaLengkap,
      tmtBerakhirKerja: r.tmtBerakhirKerja ?? "",
    }));

    // Log the auto update in activity_log.
    await db.insert(activityLog).values({
      user_id: null,
      user_email: "system@gapura.internal",
      user_name: "Sistem",
      activity: "auto_status_update",
      description: `Sistem otomatis mengubah status ${expiredRows.length} karyawan menjadi Non Aktif karena kontrak berakhir`,
      target_type: "employee",
      target_id: null,
      target_label: null,
      metadata: details,
    });

    logger.info(
      `Cron: updated ${expiredRows.length} expired contracts to Non Aktif`,
    );

    return NextResponse.json<ApiResponse<UpdateContractResult>>({
      success: true,
      data: { updatedCount: expiredRows.length, details },
    });
  } catch (err) {
    logger.error("Cron update-contract-status failed", err);
    return fail(500, "INTERNAL_ERROR", "Gagal mengupdate status kontrak");
  }
}
