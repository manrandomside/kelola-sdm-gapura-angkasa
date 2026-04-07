import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Primary Drizzle client untuk seluruh aplikasi. Menggunakan connection
// pooler Supabase (DATABASE_URL) sehingga aman dipakai dari serverless /
// edge runtime Next.js.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL env var (check .env.local)");
}

// `prepare: false` diperlukan oleh Supabase Transaction Pooler (port 6543).
const queryClient = postgres(databaseUrl, { prepare: false });

export const db = drizzle(queryClient, { schema });

export { schema };

// Factory opsional untuk direct connection (bypass pooler). Digunakan
// dalam skrip migrasi / maintenance yang butuh session-mode Postgres.
export function createDirectClient() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    throw new Error("Missing DIRECT_URL env var (check .env.local)");
  }
  const client = postgres(directUrl, { max: 1 });
  return { client, db: drizzle(client, { schema }) };
}
