import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// drizzle-kit tidak otomatis memuat .env.local, jadi muat manual.
loadEnv({ path: ".env.local" });

// Supabase telah phase out IPv4 untuk direct DB connection, sehingga
// host `db.<ref>.supabase.co` biasanya tidak resolvable dari jaringan
// IPv4-only. Default-nya kita pakai DATABASE_URL (connection pooler)
// yang selalu tersedia; boleh override dengan DIRECT_URL bila project
// sudah punya IPv6 / IPv4 add-on.
const connectionUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
if (!connectionUrl) {
  throw new Error(
    "Missing DIRECT_URL / DATABASE_URL env var (check .env.local)",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dbCredentials: {
    url: connectionUrl,
  },
  strict: true,
  verbose: true,
});
