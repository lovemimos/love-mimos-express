import dotenv from "dotenv";
import pg from "pg";
dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const existing = new Set((await pool.query('SELECT "tinyId" FROM "Product"')).rows.map((row) => String(row.tinyId)));
const synchronized = new Set((await pool.query('SELECT "tinyId" FROM "Product" WHERE "lastTinySyncAt" IS NOT NULL')).rows.map((row) => String(row.tinyId)));
const tiny = [];
for (let pagina = 1; ; pagina += 1) {
  const response = await fetch("https://api.tiny.com.br/api2/produtos.pesquisa.php", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: process.env.TINY_API_TOKEN, formato: "JSON", pagina: String(pagina) }) });
  const json = await response.json();
  if (json?.retorno?.status === "Erro") throw new Error((json.retorno.erros ?? []).map((item) => item.erro).join("; ") || `Tiny code ${json.retorno.codigo_erro}`);
  const products = (json?.retorno?.produtos ?? []).map((item) => item.produto).filter(Boolean);
  tiny.push(...products);
  if (!products.length || products.length < 100 || pagina >= Number(json?.retorno?.numero_paginas ?? Infinity)) break;
  await new Promise((resolve) => setTimeout(resolve, 1100));
}
const missing = tiny.filter((product) => !existing.has(String(product.id)));
const possibleVariants = tiny.filter((product) => product.tipoVariacao && product.tipoVariacao !== "N");
const parentIds = new Set(tiny.filter((product) => product.tipoVariacao !== "V").map((product) => String(product.id)));
const childIds = new Set(tiny.filter((product) => product.tipoVariacao === "V").map((product) => String(product.id)));
const dbProducts = (await pool.query('SELECT "tinyId", "classificationStatus" FROM "Product"')).rows;
console.log(JSON.stringify({
  tinyProducts: tiny.length,
  tinyParentsOrSimple: parentIds.size,
  tinyVariantChildren: childIds.size,
  postgresProducts: dbProducts.length,
  parentsMissingInPostgres: [...parentIds].filter((id) => !existing.has(id)).length,
  legacyChildProductsInPostgres: dbProducts.filter((p) => childIds.has(String(p.tinyId))).length,
  postgresOutsideCurrentTiny: dbProducts.filter((p) => !parentIds.has(String(p.tinyId)) && !childIds.has(String(p.tinyId))).length,
  pendingTotal: dbProducts.filter((p) => p.classificationStatus === "PENDING").length,
  pendingParents: dbProducts.filter((p) => p.classificationStatus === "PENDING" && parentIds.has(String(p.tinyId))).length,
  notInPostgres: missing.slice(0, 10).map((p) => ({ id: String(p.id), name: p.nome, status: p.situacao })),
  possibleVariants: possibleVariants.slice(0, 10).map((p) => ({ id: String(p.id), name: p.nome, tipoVariacao: p.tipoVariacao })),
}));
if (process.env.LOCAL_SYNC_URL && process.env.LOCAL_SYNC_SECRET) {
  const ids = tiny
    .filter((product) => product.tipoVariacao !== "V")
    .map((product) => String(product.id))
    .filter((id) => process.env.SYNC_ONLY_UNSYNCED !== "true" || !synchronized.has(id));
  console.log(JSON.stringify({ syncQueue: ids.length, strategy: process.env.SYNC_ONLY_UNSYNCED === "true" ? "unsynchronized-only" : "all-parents" }));
  if (process.env.SYNC_ONE_BY_ONE === "true") {
    const totals = { processed: 0, created: 0, updated: 0, unchanged: 0, errors: 0, review: 0 };
    for (const [index, id] of ids.entries()) {
      const response = await fetch(process.env.LOCAL_SYNC_URL, { method: "POST", headers: { authorization: `Bearer ${process.env.LOCAL_SYNC_SECRET}`, "content-type": "application/json" }, body: JSON.stringify({ mode: "full", ids: [id] }) });
      const result = await response.json();
      for (const key of Object.keys(totals)) totals[key] += Number(result[key] ?? 0);
      console.log(JSON.stringify({ progress: `${index + 1}/${ids.length}`, id, status: response.status, result }));
      if (!response.ok || result.errors) process.exitCode = 1;
    }
    console.log(JSON.stringify({ idempotencyTotals: totals }));
  } else {
    const response = await fetch(process.env.LOCAL_SYNC_URL, { method: "POST", headers: { authorization: `Bearer ${process.env.LOCAL_SYNC_SECRET}`, "content-type": "application/json" }, body: JSON.stringify({ mode: "full", ids }) });
    console.log(JSON.stringify(await response.json()));
    if (!response.ok) process.exitCode = 1;
  }
}
await pool.end();
