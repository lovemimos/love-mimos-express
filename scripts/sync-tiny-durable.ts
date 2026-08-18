import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });

async function main() {
  const { syncTinyCatalog } = await import("../src/lib/tiny-sync/tiny-sync-service");
  const args = process.argv.slice(2);
  const ids = args.filter((arg) => /^\d+$/.test(arg));
  const mode = args.includes("--full") ? "full" : "incremental";
  const result = await syncTinyCatalog({ trigger: "script", mode, ids: ids.length ? ids : undefined });
  console.log(JSON.stringify(result, null, 2));
  if (result.errors) process.exitCode = 1;
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
