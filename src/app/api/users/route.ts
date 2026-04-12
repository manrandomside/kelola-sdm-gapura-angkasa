import { NextResponse } from "next/server";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, employee, user } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProviderFilter, getSessionUser, isGapuraAdmin } from "@/lib/utils/auth";
import { logger } from "@/lib/utils/logger";
import { createUserSchema } from "@/lib/validations/user";

import type { UserRole } from "@/lib/constants/enums";
import type { ApiResponse } from "@/types/api";
import type { UserStatus } from "@/types/user";

interface UserListItem {
  id: string;
  nip: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  employee_id: number | null;
  provider: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  superAdmin: number;
  admin: number;
  staff: number;
}

interface UserListResponse {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: UserStatistics;
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

function nipToEmail(nip: string): string {
  return `${nip.toLowerCase()}@gapura.internal`;
}

// Ambil app user + role check super_admin. Return null jika gagal (response sudah dikirim).
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

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);
  const search = searchParams.get("search")?.trim() ?? "";
  const role = searchParams.get("role")?.trim() || null;
  const status = searchParams.get("status")?.trim() || null;

  // Provider-scoped admins can only see users from their own provider.
  // They should NOT see other super_admin accounts.
  const providerScope = getProviderFilter(auth);

  const conditions: SQL[] = [];

  if (providerScope) {
    // Only show users that have the same provider OR whose linked employee
    // belongs to the same provider. Also hide other super_admin accounts.
    conditions.push(eq(user.provider, providerScope));
  }

  if (search.length > 0) {
    const pattern = `%${search}%`;
    const searchCondition = or(
      ilike(user.nip, pattern),
      ilike(user.full_name, pattern),
      ilike(user.email, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (role) conditions.push(eq(user.role, role));
  if (status) conditions.push(eq(user.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const [rows, totalRows, statsRows] = await Promise.all([
      db
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
        })
        .from(user)
        .where(whereClause)
        .orderBy(desc(user.created_at))
        .limit(limit)
        .offset((page - 1) * limit),

      db.select({ value: count() }).from(user).where(whereClause),

      db
        .select({
          total: count(),
          active: sql<number>`count(*) filter (where ${user.status} = 'active')`,
          inactive: sql<number>`count(*) filter (where ${user.status} = 'inactive')`,
          superAdmin: sql<number>`count(*) filter (where ${user.role} = 'super_admin')`,
          admin: sql<number>`count(*) filter (where ${user.role} = 'admin')`,
          staff: sql<number>`count(*) filter (where ${user.role} = 'staff')`,
        })
        .from(user)
        .where(providerScope ? eq(user.provider, providerScope) : undefined),
    ]);

    const total = Number(totalRows[0]?.value ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const users: UserListItem[] = rows.map((row) => ({
      id: row.id,
      nip: row.nip,
      full_name: row.full_name,
      email: row.email,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      employee_id: row.employee_id,
      provider: row.provider,
      last_login_at: row.last_login_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
    }));

    const statsRow = statsRows[0];
    const statistics: UserStatistics = {
      total: Number(statsRow?.total ?? 0),
      active: Number(statsRow?.active ?? 0),
      inactive: Number(statsRow?.inactive ?? 0),
      superAdmin: Number(statsRow?.superAdmin ?? 0),
      admin: Number(statsRow?.admin ?? 0),
      staff: Number(statsRow?.staff ?? 0),
    };

    return NextResponse.json<ApiResponse<UserListResponse>>({
      success: true,
      data: {
        users,
        pagination: { page, limit, total, totalPages },
        statistics,
      },
    });
  } catch (err) {
    logger.error("Failed to fetch users", err);
    return fail(500, "INTERNAL_ERROR", "Gagal memuat daftar pengguna");
  }
}

interface CreatedUserResponse {
  user: {
    id: string;
    nip: string;
    full_name: string;
    role: UserRole;
  };
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<CreatedUserResponse>>> {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "INVALID_BODY", "Body request tidak valid");
  }

  const parsed = createUserSchema.safeParse(body);
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

  // Provider-scoped admin cannot assign super_admin role.
  const createProviderScope = getProviderFilter(auth);
  if (createProviderScope && data.role === "super_admin") {
    return fail(403, "FORBIDDEN", "Anda tidak dapat membuat akun Super Admin");
  }

  try {
    // Cek NIP tidak boleh bentrok di tabel user.
    const nipInUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.nip, data.nip))
      .limit(1);
    if (nipInUser.length > 0) {
      return fail(409, "NIP_TAKEN", "NIP sudah terdaftar sebagai pengguna");
    }

    // Cek NIP di tabel employee — jika ada, link ke employee tersebut.
    const empRows = await db
      .select({ id: employee.id, nama_lengkap: employee.nama_lengkap })
      .from(employee)
      .where(eq(employee.nip, data.nip))
      .limit(1);
    const linkedEmployeeId = empRows[0]?.id ?? null;

    // Create di Supabase Auth via admin client.
    const supabaseAdmin = createSupabaseAdminClient();
    const email = data.email ?? nipToEmail(data.nip);

    const createRes = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        nip: data.nip,
        full_name: data.full_name,
      },
    });

    if (createRes.error || !createRes.data.user) {
      logger.error("Failed to create supabase auth user", createRes.error);
      const msg = createRes.error?.message ?? "Gagal membuat akun auth";
      return fail(500, "AUTH_CREATE_FAILED", msg);
    }

    const authUserId = createRes.data.user.id;

    const inserted = await db
      .insert(user)
      .values({
        supabase_auth_id: authUserId,
        nip: data.nip,
        email,
        full_name: data.full_name,
        role: data.role,
        status: "active",
        employee_id: linkedEmployeeId,
      })
      .returning({
        id: user.id,
        nip: user.nip,
        full_name: user.full_name,
        role: user.role,
      });

    const created = inserted[0];
    if (!created) {
      // Rollback: hapus akun auth yang sudah dibuat agar tidak orphan.
      await supabaseAdmin.auth.admin
        .deleteUser(authUserId)
        .catch((err) => logger.error("Failed to rollback auth user", err));
      return fail(500, "INTERNAL_ERROR", "Gagal menambah pengguna");
    }

    // Activity log — non-fatal.
    try {
      await db.insert(activityLog).values({
        user_id: auth.id,
        user_email: auth.email,
        user_name: auth.fullName,
        activity: "create_user",
        description: `${auth.fullName} menambah pengguna ${created.full_name} (${created.nip}) dengan role ${created.role}`,
        target_type: "user",
        target_label: created.full_name,
        metadata: { role: created.role },
        ip_address: request.headers.get("x-forwarded-for") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      });
    } catch (err) {
      logger.error("Failed to log create_user activity", err);
    }

    return NextResponse.json<ApiResponse<CreatedUserResponse>>({
      success: true,
      data: {
        user: {
          id: created.id,
          nip: created.nip,
          full_name: created.full_name,
          role: created.role as UserRole,
        },
      },
    });
  } catch (err) {
    logger.error("Failed to create user", err);
    return fail(500, "INTERNAL_ERROR", "Gagal menambah pengguna");
  }
}
