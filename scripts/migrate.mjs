import { config as loadEnv } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

loadEnv({ path: ".env.local" });

const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!url) {
  console.error("Missing DATABASE_URL / DIRECT_URL");
  process.exit(1);
}

const migrationsDir = "src/lib/db/migrations";
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No migration files found in", migrationsDir);
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });

try {
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`\nApplying ${file} (${statements.length} statements)`);
    for (const stmt of statements) {
      try {
        await client.unsafe(stmt);
      } catch (err) {
        const msg = String(err.message ?? err);
        // Treat "already exists" as idempotent skip so the script is rerunnable.
        if (/already exists/i.test(msg)) {
          console.log("  skip (exists):", msg.split("\n")[0]);
          continue;
        }
        console.error("  FAILED statement:\n", stmt.slice(0, 200));
        throw err;
      }
    }
    console.log(`Done ${file}`);
  }
  console.log("\nAll migrations applied.");
} finally {
  await client.end({ timeout: 5 });
}
