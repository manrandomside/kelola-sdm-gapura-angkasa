import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

try {
  const [{ n: orgCount }] = await client`SELECT COUNT(*)::int AS n FROM organization`;
  const [{ n: unitCount }] = await client`SELECT COUNT(*)::int AS n FROM unit`;
  const [{ n: subCount }] = await client`SELECT COUNT(*)::int AS n FROM sub_unit`;
  const [{ n: userCount }] = await client`SELECT COUNT(*)::int AS n FROM "user"`;
  const [{ n: authCount }] = await client`SELECT COUNT(*)::int AS n FROM auth.users WHERE email = 'superadmin@gapura.internal'`;

  console.log("organization:", orgCount);
  console.log("unit:        ", unitCount);
  console.log("sub_unit:    ", subCount);
  console.log('user:        ', userCount);
  console.log("auth.users (superadmin):", authCount);

  const superadmin = await client`SELECT nip, role, status, email FROM "user" WHERE nip = 'SUPERADMIN'`;
  console.log("super admin row:", superadmin[0]);

  const subByUnit = await client`
    SELECT u.unit_organisasi, COUNT(s.id)::int AS n
    FROM unit u
    LEFT JOIN sub_unit s ON s.unit_id = u.id
    GROUP BY u.unit_organisasi
    ORDER BY u.unit_organisasi
  `;
  console.log("sub_unit by unit_organisasi:");
  for (const row of subByUnit) console.log("  ", row.unit_organisasi, "->", row.n);
} finally {
  await client.end({ timeout: 5 });
}
