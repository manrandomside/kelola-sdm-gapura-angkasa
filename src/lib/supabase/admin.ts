import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase admin client yang memakai SERVICE_ROLE_KEY.
// WAJIB digunakan hanya di API route / Server Action — JANGAN sampai
// bocor ke client bundle. Dipakai untuk operasi seperti
// auth.admin.createUser saat auto-create akun karyawan dari import.
let cached: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL env var");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var");
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
