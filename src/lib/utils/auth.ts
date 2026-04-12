// Helper functions for multi-provider Super Admin access control.

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export interface UserWithProvider {
  role: string;
  provider?: string | null;
}

// Slim session shape returned by getSessionUser.
export interface SessionUserInfo {
  id: string;
  nip: string;
  fullName: string;
  email: string | null;
  role: string;
  provider: string | null;
}

// Check whether a user is a Gapura Super Admin (full access to all data).
// A super_admin with provider = 'PT Gapura Angkasa', NULL, or undefined
// is treated as a Gapura admin with unrestricted access.
export function isGapuraAdmin(u: UserWithProvider): boolean {
  return (
    u.role === "super_admin" &&
    (u.provider === "PT Gapura Angkasa" ||
      u.provider === null ||
      u.provider === undefined)
  );
}

// Return the provider filter string for query scoping.
// - Returns null if the user can access all data (Gapura admin).
// - Returns the provider name if the user is scoped to a specific provider.
// - Returns null for admin/staff (no provider scope for now).
export function getProviderFilter(u: UserWithProvider): string | null {
  if (isGapuraAdmin(u)) return null;
  if (u.role === "super_admin" && u.provider) return u.provider;
  return null;
}

// Fetch full session user info from the application user table using
// the Supabase auth user id. Returns null if user not found or inactive.
export async function getSessionUser(
  supabaseAuthId: string,
): Promise<SessionUserInfo | null> {
  const rows = await db
    .select({
      id: user.id,
      nip: user.nip,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      provider: user.provider,
    })
    .from(user)
    .where(eq(user.supabase_auth_id, supabaseAuthId))
    .limit(1);

  const row = rows[0];
  if (!row || row.status !== "active") return null;

  return {
    id: row.id,
    nip: row.nip,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    provider: row.provider,
  };
}
