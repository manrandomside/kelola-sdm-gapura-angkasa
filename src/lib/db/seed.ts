import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";

import {
  organization,
  subUnit,
  unit,
  user,
} from "@/lib/db/schema";

// Idempotent seed script.
// Run with: npm run db:seed
//
// Requires env vars (from .env.local):
//   DATABASE_URL              — Supabase connection pooler
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY — used to create the super_admin auth user

loadEnv({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const SUPERADMIN_EMAIL = "superadmin@gapura.internal";
const SUPERADMIN_NIP = "SUPERADMIN";
const SUPERADMIN_PASSWORD = "SUPERADMIN";
const SUPERADMIN_FULL_NAME = "Super Administrator";

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const ORGANIZATIONS: ReadonlyArray<{
  kode_organisasi: string;
  nama_organisasi: string;
  unit_organisasi: string;
}> = [
  { kode_organisasi: "MO", nama_organisasi: "OPERATION SERVICES", unit_organisasi: "Airside" },
  { kode_organisasi: "ME", nama_organisasi: "MAINTENANCE SERVICES", unit_organisasi: "GSE" },
  { kode_organisasi: "MF", nama_organisasi: "FLIGHT SERVICES", unit_organisasi: "Airside" },
  { kode_organisasi: "MS", nama_organisasi: "MOVEMENT SERVICES", unit_organisasi: "Landside" },
  { kode_organisasi: "MU", nama_organisasi: "MANAGEMENT UNIT", unit_organisasi: "Back Office" },
  { kode_organisasi: "MK", nama_organisasi: "FINANCE", unit_organisasi: "Back Office" },
  { kode_organisasi: "MQ", nama_organisasi: "QUALITY SERVICES", unit_organisasi: "Back Office" },
  { kode_organisasi: "MB", nama_organisasi: "BUSINESS SERVICES", unit_organisasi: "Ancillary" },
  { kode_organisasi: "EGM", nama_organisasi: "EGM", unit_organisasi: "EGM" },
  { kode_organisasi: "GM", nama_organisasi: "GM", unit_organisasi: "GM" },
];

const UNITS: ReadonlyArray<{
  unit_organisasi: string;
  kode: string;
  nama: string;
}> = [
  { unit_organisasi: "Airside", kode: "MO", nama: "OPERATION SERVICES" },
  { unit_organisasi: "Landside", kode: "MS", nama: "MOVEMENT SERVICES" },
  { unit_organisasi: "GSE", kode: "ME", nama: "MAINTENANCE SERVICES" },
  { unit_organisasi: "GH", kode: "MO", nama: "GROUND HANDLING" },
  { unit_organisasi: "Back Office", kode: "MU", nama: "MANAGEMENT UNIT" },
  { unit_organisasi: "Ancillary", kode: "MB", nama: "BUSINESS SERVICES" },
  { unit_organisasi: "Avsec", kode: "MO", nama: "AVIATION SECURITY" },
  { unit_organisasi: "EGM", kode: "EGM", nama: "EXECUTIVE GENERAL MANAGER" },
  { unit_organisasi: "GM", kode: "GM", nama: "GENERAL MANAGER" },
];

// Mapping sub unit ke unit_organisasi berdasar logika operasional ground handling.
// Nama sub unit ditulis persis seperti di CSV (termasuk spasi di "HR &GA").
const SUB_UNITS_BY_UNIT_ORGANISASI: ReadonlyArray<{
  unit_organisasi: string;
  names: ReadonlyArray<string>;
}> = [
  {
    unit_organisasi: "Airside",
    names: [
      "APRON",
      "RAMP",
      "LOADING MASTER",
      "LOAD CONTROL",
      "FOO",
      "HEADSETMAN",
      "DEPCO",
      "CREW DESK",
    ],
  },
  {
    unit_organisasi: "Landside",
    names: ["JOUMPA", "CARGO INTERNASIONAL", "GAPURA SERVICE", "ULD CONTROL"],
  },
  {
    unit_organisasi: "GSE",
    names: ["GSE BTT", "GSE AC", "GSE PB", "WORKSHOP GSE MEKANIK"],
  },
  {
    unit_organisasi: "GH",
    names: ["Airside Landside", "Operation"],
  },
  {
    unit_organisasi: "Back Office",
    names: ["HR &GA", "Back Office", "Kantor Cabang", "BANDAR UDARA NGURAH RAI"],
  },
  {
    unit_organisasi: "Ancillary",
    names: ["GLC", "GAPURA LEARNING CENTRE"],
  },
];

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function main() {
  const client = postgres(DATABASE_URL!, { max: 1, prepare: false });
  const db = drizzle(client, { schema: { organization, unit, subUnit, user } });
  const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    await seedOrganizations(db);
    await seedUnits(db);
    await seedSubUnits(db);
    await seedSuperAdmin(db, supabaseAdmin);
    console.log("\nSeed completed successfully!");
  } finally {
    await client.end({ timeout: 5 });
  }
}

type Db = ReturnType<typeof drizzle<{
  organization: typeof organization;
  unit: typeof unit;
  subUnit: typeof subUnit;
  user: typeof user;
}>>;

async function seedOrganizations(db: Db) {
  process.stdout.write("Seeding organizations... ");
  let inserted = 0;
  for (let i = 0; i < ORGANIZATIONS.length; i++) {
    const row = ORGANIZATIONS[i];
    const result = await db
      .insert(organization)
      .values({
        kode_organisasi: row.kode_organisasi,
        nama_organisasi: row.nama_organisasi,
        unit_organisasi: row.unit_organisasi,
        is_active: true,
        sort_order: i + 1,
      })
      .onConflictDoNothing({ target: organization.kode_organisasi })
      .returning({ id: organization.id });
    if (result.length > 0) inserted++;
  }
  console.log(`done (${inserted} inserted, ${ORGANIZATIONS.length - inserted} already present)`);
}

async function seedUnits(db: Db) {
  process.stdout.write("Seeding units... ");
  let inserted = 0;
  for (let i = 0; i < UNITS.length; i++) {
    const row = UNITS[i];
    // unit has no unique constraint, so check manually.
    const existing = await db
      .select({ id: unit.id })
      .from(unit)
      .where(
        and(
          eq(unit.unit_organisasi, row.unit_organisasi),
          eq(unit.kode, row.kode),
          eq(unit.nama, row.nama),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(unit).values({
      unit_organisasi: row.unit_organisasi,
      kode: row.kode,
      nama: row.nama,
      is_active: true,
      sort_order: i + 1,
    });
    inserted++;
  }
  console.log(`done (${inserted} inserted, ${UNITS.length - inserted} already present)`);
}

async function seedSubUnits(db: Db) {
  process.stdout.write("Seeding sub units... ");
  let inserted = 0;
  let total = 0;

  for (const group of SUB_UNITS_BY_UNIT_ORGANISASI) {
    // Resolve parent unit_id by unit_organisasi.
    const parentRows = await db
      .select({ id: unit.id })
      .from(unit)
      .where(eq(unit.unit_organisasi, group.unit_organisasi))
      .limit(1);
    const parent = parentRows[0];
    if (!parent) {
      console.warn(
        `\n  warn: parent unit not found for unit_organisasi="${group.unit_organisasi}", skipping ${group.names.length} sub units`,
      );
      continue;
    }

    for (let i = 0; i < group.names.length; i++) {
      total++;
      const nama = group.names[i];
      const existing = await db
        .select({ id: subUnit.id })
        .from(subUnit)
        .where(and(eq(subUnit.unit_id, parent.id), eq(subUnit.nama, nama)))
        .limit(1);
      if (existing.length > 0) continue;
      await db.insert(subUnit).values({
        unit_id: parent.id,
        nama,
        is_active: true,
        sort_order: i + 1,
      });
      inserted++;
    }
  }
  console.log(`done (${inserted} inserted, ${total - inserted} already present)`);
}

async function seedSuperAdmin(db: Db, supabaseAdmin: SupabaseClient) {
  process.stdout.write("Seeding super admin account... ");

  // If the application user row already exists, nothing to do.
  const existingUser = await db
    .select({ id: user.id, supabase_auth_id: user.supabase_auth_id })
    .from(user)
    .where(eq(user.nip, SUPERADMIN_NIP))
    .limit(1);

  if (existingUser.length > 0) {
    console.log("already exists, skipped");
    return;
  }

  // Find or create the Supabase Auth user.
  let authUserId: string | null = null;

  // Try create first; Supabase returns an error if the email is taken.
  const createRes = await supabaseAdmin.auth.admin.createUser({
    email: SUPERADMIN_EMAIL,
    password: SUPERADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { nip: SUPERADMIN_NIP, full_name: SUPERADMIN_FULL_NAME },
  });

  if (createRes.data.user) {
    authUserId = createRes.data.user.id;
  } else if (createRes.error) {
    // Existing auth user — look it up via listUsers and match by email.
    const list = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (list.error) {
      throw new Error(
        `Failed to list auth users: ${list.error.message} (create err: ${createRes.error.message})`,
      );
    }
    const match = list.data.users.find((u) => u.email === SUPERADMIN_EMAIL);
    if (!match) {
      throw new Error(
        `Could not create or locate super admin auth user: ${createRes.error.message}`,
      );
    }
    authUserId = match.id;
  }

  if (!authUserId) {
    throw new Error("Super admin auth user id is null");
  }

  await db.insert(user).values({
    supabase_auth_id: authUserId,
    nip: SUPERADMIN_NIP,
    email: SUPERADMIN_EMAIL,
    full_name: SUPERADMIN_FULL_NAME,
    role: "super_admin",
    status: "active",
  });

  console.log("done (1 record)");
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
