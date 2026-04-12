import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, user } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";
import { updateUserSchema } from "@/lib/validations/user";

import type { UserRole } from "@/lib/constants/enums";
import type { ApiResponse } from "@/types/api";
import type { UserStatus } from "@/types/user";

interface UserDetail {
  id: string;
  nip: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  employee_id: number | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
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

interface SuperAdminInfo {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  provider: string | null;
}

async function requireSuperAdmin(): Promise<
  SuperAdminInfo | NextResponse<ApiResponse<never>>
> {
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
  if (appUser.role !== "super_admin") {
    return fail(
      403,
      "FORBIDDEN",
      "Hanya Super Admin yang dapat mengakses manajemen pengguna",
    );
  }
  return appUser;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<ApiResponse<{ user: UserDetail }>>> {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id) {
    return fail(400, "INVALID_ID", "ID pengguna tidak valid");
  }

  const getProviderScope = getProviderFilter(auth);

  try {
    const rows = await db
      .select({
        id: user.id,
        nip: user.nip,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
        employee_id: user.employee_id,
        provider: user.provider,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return fail(404, "NOT_FOUND", "Pengguna tidak ditemukan");
    }

    // Provider-scoped admin can only view users from their own provider.
    if (getProviderScope && row.provider !== getProviderScope) {
      return fail(403, "FORBIDDEN", "Anda tidak memiliki akses ke pengguna ini");
    }

    const detail: UserDetail = {
      id: row.id,
      nip: row.nip,
      full_name: row.full_name,
      email: row.email,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      employee_id: row.employee_id,
      last_login_at: row.last_login_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };

    return NextResponse.json<ApiResponse<{ user: UserDetail }>>({
      success: true,
      data: { user: detail },
    });
  } catch (err) {
    logger.error("Failed to fetch user detail", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat detail pengguna");
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<ApiResponse<{ user: UserDetail }>>> {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id) {
    return fail(400, "INVALID_ID", "ID pengguna tidak valid");
  }

  if (id === auth.id) {
    return fail(
      400,
      "SELF_UPDATE_FORBIDDEN",
      "Tidak dapat mengubah akun sendiri",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_BODY", "Body request tidak valid");
  }

  const parsed = updateUserSchema.safeParse(body);
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

  // Provider-scoped admins cannot assign super_admin role.
  const putProviderScope = getProviderFilter(auth);
  if (putProviderScope && data.role === "super_admin") {
    return fail(403, "FORBIDDEN", "Anda tidak dapat mengubah role menjadi Super Admin");
  }

  try {
    const existingRows = await db
      .select({
        id: user.id,
        nip: user.nip,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        provider: user.provider,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    const existing = existingRows[0];
    if (!existing) {
      return fail(404, "NOT_FOUND", "Pengguna tidak ditemukan");
    }

    // Provider-scoped admin can only edit users from their own provider.
    if (putProviderScope && existing.provider !== putProviderScope) {
      return fail(403, "FORBIDDEN", "Anda tidak memiliki akses ke pengguna ini");
    }

    // Provider-scoped admin cannot edit other super_admin accounts.
    if (putProviderScope && existing.role === "super_admin" && existing.id !== auth.id) {
      return fail(403, "FORBIDDEN", "Anda tidak dapat mengubah akun Super Admin lain");
    }

    const updatedRows = await db
      .update(user)
      .set({
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        updated_at: new Date(),
      })
      .where(eq(user.id, id))
      .returning({
        id: user.id,
        nip: user.nip,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
        employee_id: user.employee_id,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      });

    const updated = updatedRows[0];
    if (!updated) {
      return fail(500, "INTERNAL_ERROR", "Gagal memperbarui pengguna");
    }

    // Activity log — non-fatal.
    try {
      const changes: string[] = [];
      if (data.role !== undefined && data.role !== existing.role) {
        changes.push(`role: ${existing.role} -> ${data.role}`);
      }
      if (data.status !== undefined && data.status !== existing.status) {
        changes.push(`status: ${existing.status} -> ${data.status}`);
      }
      const activityType =
        data.role !== undefined ? "update_role" : "update_user";
      await db.insert(activityLog).values({
        user_id: auth.id,
        user_email: auth.email,
        user_name: auth.fullName,
        activity: activityType,
        description: `${auth.fullName} memperbarui pengguna ${existing.full_name} (${existing.nip})${
          changes.length > 0 ? ` — ${changes.join(", ")}` : ""
        }`,
        target_type: "user",
        target_label: existing.full_name,
        metadata: {
          changes: data,
          previous: { role: existing.role, status: existing.status },
        },
        ip_address: request.headers.get("x-forwarded-for") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (err) {
      logger.error("Failed to log update_user activity", err);
    }

    const detail: UserDetail = {
      id: updated.id,
      nip: updated.nip,
      full_name: updated.full_name,
      email: updated.email,
      role: updated.role as UserRole,
      status: updated.status as UserStatus,
      employee_id: updated.employee_id,
      last_login_at: updated.last_login_at?.toISOString() ?? null,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
    };

    return NextResponse.json<ApiResponse<{ user: UserDetail }>>({
      success: true,
      data: { user: detail },
    });
  } catch (err) {
    logger.error("Failed to update user", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memperbarui pengguna");
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!id) {
    return fail(400, "INVALID_ID", "ID pengguna tidak valid");
  }

  if (id === auth.id) {
    return fail(
      400,
      "SELF_DELETE_FORBIDDEN",
      "Tidak dapat menonaktifkan akun sendiri",
    );
  }

  const delProviderScope = getProviderFilter(auth);

  try {
    const existingRows = await db
      .select({
        id: user.id,
        nip: user.nip,
        full_name: user.full_name,
        supabase_auth_id: user.supabase_auth_id,
        status: user.status,
        role: user.role,
        provider: user.provider,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    const existing = existingRows[0];
    if (!existing) {
      return fail(404, "NOT_FOUND", "Pengguna tidak ditemukan");
    }

    // Provider-scoped admin restrictions.
    if (delProviderScope && existing.provider !== delProviderScope) {
      return fail(403, "FORBIDDEN", "Anda tidak memiliki akses ke pengguna ini");
    }
    if (delProviderScope && existing.role === "super_admin") {
      return fail(403, "FORBIDDEN", "Anda tidak dapat menonaktifkan akun Super Admin");
    }

    if (existing.status === "inactive") {
      return fail(400, "ALREADY_INACTIVE", "Pengguna sudah nonaktif");
    }

    // Soft delete: set status = 'inactive'.
    await db
      .update(user)
      .set({ status: "inactive", updated_at: new Date() })
      .where(eq(user.id, id));

    // Nonaktifkan juga di Supabase Auth agar tidak bisa login.
    try {
      const supabaseAdmin = createSupabaseAdminClient();
      await supabaseAdmin.auth.admin.updateUserById(existing.supabase_auth_id, {
        ban_duration: "876000h", // ~100 tahun = efektif permanen
      });
    } catch (err) {
      logger.error("Failed to ban supabase auth user", err);
    }

    // Activity log — non-fatal.
    try {
      await db.insert(activityLog).values({
        user_id: auth.id,
        user_email: auth.email,
        user_name: auth.fullName,
        activity: "delete_user",
        description: `${auth.fullName} menonaktifkan pengguna ${existing.full_name} (${existing.nip})`,
        target_type: "user",
        target_label: existing.full_name,
        ip_address: request.headers.get("x-forwarded-for") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (err) {
      logger.error("Failed to log delete_user activity", err);
    }

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Pengguna berhasil dinonaktifkan" },
    });
  } catch (err) {
    logger.error("Failed to deactivate user", err);
    return fail(500, "INTERNAL_ERROR", "Gagal menonaktifkan pengguna");
  }
}
