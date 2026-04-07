import "dotenv/config";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: ".env.local" });

async function test(label, url) {
  if (!url) {
    console.log(label, "MISSING URL");
    return;
  }
  try {
    const client = postgres(url, { max: 1, connect_timeout: 10, prepare: false });
    const rows = await client`select 1 as ok`;
    console.log(label, "OK", rows[0]);
    await client.end({ timeout: 5 });
  } catch (err) {
    console.error(label, "FAIL:", err.message);
  }
}

await test("DIRECT_URL", process.env.DIRECT_URL);
await test("DATABASE_URL", process.env.DATABASE_URL);
