import dotenv from "dotenv";
import pg from "pg";
dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });

const runId = process.argv[2];
if (!runId) throw new Error("Sync run id is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const result = await client.query(`UPDATE "TinySyncRun" SET status='INTERRUPTED', "finishedAt"=NOW() WHERE id=$1 AND status='RUNNING'`, [runId]);
  if (result.rowCount !== 1) throw new Error("Running sync not found");
  await client.query(`DELETE FROM "TinySyncLock" WHERE id='catalog'`);
  await client.query("COMMIT");
  console.log("INTERRUPTED_SYNC_CLOSED");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally { await client.end(); }
