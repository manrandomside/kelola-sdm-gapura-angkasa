import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/utils/logger";

export interface CreateUserAccountParams {
  nip: string;
  namaLengkap: string;
  employeeId: number;
}

export interface CreateUserAccountResult {
  success: boolean;
  skipped: boolean;
  userId?: string;
  authUserId?: string;
  error?: string;
}

export function buildInternalEmail(nip: string): string {
  return `${nip.trim().toLowerCase()}@gapura.internal`;
}

// Auto-create akun login untuk karyawan baru. Dipakai oleh flow tambah
// karyawan manual (/api/employees) dan import bulk (/api/import/execute-batch).
// Email = {nip}@gapura.internal, password = NIP, role = staff.
// Return skipped=true jika user dengan NIP ini sudah ada (tidak overwrite).
export async function createUserAccount(
  params: CreateUserAccountParams,
): Promise<CreateUserAccountResult> {
  const nip = params.nip.trim();
  const namaLengkap = params.namaLengkap.trim();
  const employeeId = Number(params.employeeId);

  if (!nip || !namaLengkap || !Number.isFinite(employeeId)) {
    return {
      success: false,
      skipped: false,
      error: "Parameter nip / nama_lengkap / employee_id tidak valid",
    };
  }

  try {
    const existingUserRow = await db
      .select({ id: user.id, supabase_auth_id: user.supabase_auth_id })
      .from(user)
      .where(eq(user.nip, nip))
      .limit(1);

    if (existingUserRow.length > 0) {
      // User untuk NIP ini sudah ada — cukup link ke employee baru.
      const existing = existingUserRow[0]!;
      await db
        .update(user)
        .set({ employee_id: employeeId, updated_at: new Date() })
        .where(eq(user.id, existing.id));

      return {
        success: true,
        skipped: true,
        userId: existing.id,
        authUserId: existing.supabase_auth_id,
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const email = buildInternalEmail(nip);
    let authUserId: string | null = null;

    const createRes = await supabaseAdmin.auth.admin.createUser({
      email,
      password: nip,
      email_confirm: true,
      user_metadata: { nip, full_name: namaLengkap },
    });

    if (createRes.data.user) {
      authUserId = createRes.data.user.id;
    } else if (createRes.error) {
      // Auth user mungkin sudah ada di Supabase tapi belum ada di tabel user.
      // Cari via listUsers dan pakai id-nya.
      const lookup = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (lookup.error) {
        return {
          success: false,
          skipped: false,
          error: `Gagal membuat akun auth: ${createRes.error.message}`,
        };
      }
      const match = lookup.data.users.find((u) => u.email === email);
      if (!match) {
        return {
          success: false,
          skipped: false,
          error: `Gagal membuat akun auth: ${createRes.error.message}`,
        };
      }
      authUserId = match.id;
    }

    if (!authUserId) {
      return {
        success: false,
        skipped: false,
        error: "Auth user id tidak tersedia",
      };
    }

    const insertedUser = await db
      .insert(user)
      .values({
        supabase_auth_id: authUserId,
        nip,
        email,
        full_name: namaLengkap,
        role: "staff",
        status: "active",
        employee_id: employeeId,
      })
      .returning({ id: user.id });

    const newUser = insertedUser[0];
    if (!newUser) {
      return {
        success: false,
        skipped: false,
        error: "Gagal menyimpan record user",
      };
    }

    return {
      success: true,
      skipped: false,
      userId: newUser.id,
      authUserId,
    };
  } catch (err) {
    logger.error(`Failed to create user account for NIP ${nip}`, err);
    const message =
      err instanceof Error ? err.message : "Kesalahan tidak diketahui";
    return {
      success: false,
      skipped: false,
      error: message,
    };
  }
}
