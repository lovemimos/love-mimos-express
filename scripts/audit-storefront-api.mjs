import dotenv from "dotenv";
import pg from "pg";
dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });

const baseUrl = process.argv[2] || "http://localhost:3023";
const response = await fetch(`${baseUrl}/api/products?limite=500`);
if (!response.ok) throw new Error(`Catalog API HTTP ${response.status}`);
const payload = await response.json();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const legacy = new Set((await pool.query('SELECT DISTINCT p."tinyId" FROM "Product" p JOIN "ProductVariant" v ON v."tinyId" = p."tinyId"')).rows.map((row) => String(row.tinyId)));
const pending = new Set((await pool.query(`SELECT "tinyId" FROM "Product" WHERE "classificationStatus"='PENDING'`)).rows.map((row) => String(row.tinyId)));
const ids = payload.items.map((item) => String(item.externalRef?.id ?? ""));
const [visibleRow, legacyRow] = await Promise.all([
  pool.query(`SELECT slug FROM "Product" p WHERE p.active AND p."classificationStatus"='CLASSIFIED' AND NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."tinyId"=p."tinyId") ORDER BY slug LIMIT 1`),
  pool.query(`SELECT p.slug FROM "Product" p JOIN "ProductVariant" v ON v."tinyId"=p."tinyId" ORDER BY p.slug LIMIT 1`),
]);
const [available, search, visiblePage, legacyPage] = await Promise.all([
  fetch(`${baseUrl}/api/products?limite=500&disponivel=1`).then((r) => r.json()),
  fetch(`${baseUrl}/api/products?limite=12&q=cilios`).then((r) => r.json()),
  fetch(`${baseUrl}/produto/${visibleRow.rows[0].slug}`),
  fetch(`${baseUrl}/produto/${legacyRow.rows[0].slug}`),
]);
console.log(JSON.stringify({ apiTotal: payload.total, apiItems: payload.items.length, legacyVisible: ids.filter((id) => legacy.has(id)).length, pendingVisible: ids.filter((id) => pending.has(id)).length, availableTotal: available.total, searchWorks: search.total > 0, visibleProductStatus: visiblePage.status, legacyProductStatus: legacyPage.status }));
await pool.end();
