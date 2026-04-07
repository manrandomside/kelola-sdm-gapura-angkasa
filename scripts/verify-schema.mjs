import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: ".env.local" });

const url = process.env.DATABASE_URL;
const client = postgres(url, { max: 1, prepare: false });

try {
  const tables = await client`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        'user','employee','organization','unit','sub_unit',
        'activity_log','import_log','app_setting'
      )
    ORDER BY table_name
  `;
  console.log("Tables found:", tables.map((r) => r.table_name));

  const empCols = await client`
    SELECT COUNT(*)::int AS n
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee'
  `;
  console.log("employee columns:", empCols[0].n);

  const fks = await client`
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `;
  console.log("Foreign keys:", fks.length);
  for (const fk of fks) console.log("  ", fk.table_name, "->", fk.constraint_name);
} finally {
  await client.end({ timeout: 5 });
}
