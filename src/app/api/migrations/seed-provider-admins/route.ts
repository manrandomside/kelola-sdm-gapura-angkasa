import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

import type { ApiResponse } from "@/types/api";

const PROVIDER_ADMINS = [
  { nip: "SUPERADMIN_GAPURA", fullName: "Super Admin Gapura", provider: "PT Gapura Angkasa" },
  { nip: "SUPERADMIN_AIRBOX", fullName: "Super Admin Air Box", provider: "PT Air Box Personalia" },
  { nip: "SUPERADMIN_FINFLEET", fullName: "Super Admin Finfleet", provider: "PT Finfleet Teknologi Indonesia" },
  { nip: "SUPERADMIN_MITRA", fullName: "Super Admin Mitra", provider: "PT Mitra Angkasa Perdana" },
  { nip: "SUPERADMIN_GRAHA", fullName: "Super Admin Graha", provider: "PT Graha Humanindo Manajemen" },
  { nip: "SUPERADMIN_MANDALA", fullName: "Super Admin Mandala", provider: "PT Mandala Garda Nusantara" },
  { nip: "SUPERADMIN_IAS", fullName: "Super Admin IAS", provider: "PT IAS Support" },
  { nip: "SUPERADMIN_KIDORA", fullName: "Super Admin Kidora", provider: "PT Kidora Mandiri Investama" },
  { nip: "SUPERADMIN_DUTA", fullName: "Super Admin Duta", provider: "PT Duta Griya Sarana" },
  { nip: "SUPERADMIN_AEROTRANS", fullName: "Super Admin Aerotrans", provider: "PT Aerotrans Wisata" },
] as const;

interface AdminDetail {
  nip: string;
  status: "created" | "skipped" | "updated_provider" | "error";
  error?: string;
}

interface SeedResult {
  created: number;
  skipped: number;
  updated: number;
  errors: number;
  details: AdminDetail[];
}

export async function POST(): Promise<NextResponse<ApiResponse<SeedResult>>> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sesi tidak valid" } },
      { status: 401 },
    );
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.supabase_auth_id, authUser.id),
  });

  if (!dbUser || dbUser.role !== "super_admin") {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Hanya super_admin yang dapat menjalankan seed" } },
      { status: 403 },
    );
  }

  // Use the Supabase service role client for creating auth users.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { success: false, error: { code: "CONFIG_ERROR", message: "SUPABASE_SERVICE_ROLE_KEY tidak dikonfigurasi" } },
      { status: 500 },
    );
  }

  // Dynamic import to avoid bundling issues.
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const details: AdminDetail[] = [];
  let created = 0;
  let skipped = 0;
  let updated = 0;
  let errors = 0;

  // Seed the 10 provider admin accounts.
  for (const admin of PROVIDER_ADMINS) {
    try {
      // Check if user with this NIP already exists in application user table.
      const existing = await db.query.user.findFirst({
        where: eq(user.nip, admin.nip),
      });

      if (existing) {
        details.push({ nip: admin.nip, status: "skipped" });
        skipped++;
        continue;
      }

      // Create Supabase auth user.
      const email = `${admin.nip.toLowerCase()}@gapura.internal`;
      const { data: authData, error: authError } =
        await adminSupabase.auth.admin.createUser({
          email,
          password: admin.nip,
          email_confirm: true,
        });

      if (authError || !authData.user) {
        logger.error(`Failed to create auth user for ${admin.nip}`, authError);
        details.push({
          nip: admin.nip,
          status: "error",
          error: authError?.message ?? "Failed to create auth user",
        });
        errors++;
        continue;
      }

      // Insert into application user table.
      await db.insert(user).values({
        supabase_auth_id: authData.user.id,
        nip: admin.nip,
        email,
        full_name: admin.fullName,
        role: "super_admin",
        status: "active",
        provider: admin.provider,
      });

      details.push({ nip: admin.nip, status: "created" });
      created++;
    } catch (err) {
      logger.error(`Error seeding admin ${admin.nip}`, err);
      details.push({
        nip: admin.nip,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
      errors++;
    }
  }

  // Update existing SUPERADMIN account provider if not set.
  try {
    const masterAdmin = await db.query.user.findFirst({
      where: eq(user.nip, "SUPERADMIN"),
    });

    if (masterAdmin && !masterAdmin.provider) {
      await db
        .update(user)
        .set({ provider: "PT Gapura Angkasa", updated_at: new Date() })
        .where(eq(user.nip, "SUPERADMIN"));

      details.push({ nip: "SUPERADMIN", status: "updated_provider" });
      updated++;
    } else if (masterAdmin) {
      details.push({ nip: "SUPERADMIN", status: "skipped" });
    }
  } catch (err) {
    logger.error("Error updating SUPERADMIN provider", err);
    details.push({
      nip: "SUPERADMIN",
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    });
    errors++;
  }

  logger.info("seed-provider-admins completed", {
    created,
    skipped,
    updated,
    errors,
  });

  return NextResponse.json({
    success: true,
    data: { created, skipped, updated, errors, details },
  });
}
