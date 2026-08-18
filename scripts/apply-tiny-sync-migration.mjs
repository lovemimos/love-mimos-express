import dotenv from "dotenv";
import fs from "node:fs/promises";
import pg from "pg";
dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });

const sql = await fs.readFile(new URL("../prisma/migrations/20260817190000_add_tiny_sync_operational_models/migration.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("TINY_SYNC_MIGRATION_OK");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
