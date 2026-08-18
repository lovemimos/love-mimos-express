import dotenv from "dotenv";
import pg from "pg";
dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(`
  SELECT
    (SELECT COUNT(*)::int FROM "Product") AS products,
    (SELECT COUNT(*)::int FROM "Product" WHERE stock > 0) AS stocked,
    (SELECT COUNT(*)::int FROM "Product" WHERE stock <= 0) AS soldout,
    (SELECT COUNT(*)::int FROM "ProductVariant") AS variants,
    (SELECT COUNT(*)::int FROM "ProductImage") AS images,
    (SELECT COUNT(*)::int FROM "Product" WHERE "classificationStatus" = 'PENDING') AS pending,
    (SELECT COUNT(DISTINCT p.id)::int FROM "Product" p JOIN "ProductVariant" v ON v."tinyId" = p."tinyId") AS "legacyIdentified",
    (SELECT COUNT(DISTINCT p.id)::int FROM "Product" p JOIN "ProductVariant" v ON v."tinyId" = p."tinyId" WHERE p.sku IS NULL OR v.sku IS NULL OR p.sku = v.sku) AS "legacySkuCompatible",
    (SELECT COUNT(DISTINCT p.id)::int FROM "Product" p JOIN "ProductVariant" v ON v."tinyId" = p."tinyId" WHERE p.active AND p."classificationStatus" = 'CLASSIFIED') AS "legacyVisibleBefore",
    (SELECT COUNT(*)::int FROM "Product" p WHERE p.active AND p."classificationStatus" = 'CLASSIFIED' AND NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."tinyId" = p."tinyId")) AS "storefrontVisible",
    (SELECT COUNT(*)::int FROM "Product" p WHERE p.active AND p."classificationStatus" = 'CLASSIFIED' AND NOT EXISTS (SELECT 1 FROM "ProductVariant" legacy WHERE legacy."tinyId" = p."tinyId") AND ((EXISTS (SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p.id) AND EXISTS (SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p.id AND pv.active AND pv.stock > 0)) OR (NOT EXISTS (SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p.id) AND p.stock > 0))) AS "storefrontStocked",
    (SELECT COUNT(*)::int FROM "Product" p WHERE p.active AND p."classificationStatus" = 'CLASSIFIED' AND NOT EXISTS (SELECT 1 FROM "ProductVariant" legacy WHERE legacy."tinyId" = p."tinyId") AND NOT ((EXISTS (SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p.id) AND EXISTS (SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p.id AND pv.active AND pv.stock > 0)) OR (NOT EXISTS (SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p.id) AND p.stock > 0))) AS "storefrontSoldout",
    (SELECT COUNT(*)::int FROM "Product" WHERE "lastTinySyncAt" > NOW() - INTERVAL '30 minutes') AS "recentlySynced",
    (SELECT md5(string_agg(id || ':' || COALESCE("departmentId", '') || ':' || COALESCE("categoryId", '') || ':' || COALESCE("brandId", ''), '|' ORDER BY id)) FROM "Product" WHERE "classificationStatus" = 'CLASSIFIED') AS "taxonomyChecksum",
    (SELECT COUNT(*)::int FROM (SELECT "productId", url FROM "ProductImage" GROUP BY "productId", url HAVING COUNT(*) > 1) duplicate_images) AS "duplicateImagePairs"
`);
console.log(JSON.stringify(rows[0]));
if (process.argv.includes("--samples")) {
  const samples = await pool.query(`
    (SELECT 'stocked' AS kind, p."tinyId", p.id FROM "Product" p WHERE p.stock > 0 ORDER BY p."updatedAt" DESC LIMIT 1)
    UNION ALL
    (SELECT 'soldout', p."tinyId", p.id FROM "Product" p WHERE p.stock <= 0 ORDER BY p."updatedAt" DESC LIMIT 1)
    UNION ALL
    (SELECT 'image', p."tinyId", p.id FROM "Product" p WHERE EXISTS (SELECT 1 FROM "ProductImage" i WHERE i."productId"=p.id) ORDER BY p."updatedAt" DESC LIMIT 1)
  `);
  console.log(JSON.stringify(samples.rows));
}
if (process.argv.includes("--runs")) {
  const runs = await pool.query('SELECT id, status, processed, created, updated, unchanged, inactivated, "notFound", errors, review, "errorSummary" FROM "TinySyncRun" ORDER BY "startedAt" DESC LIMIT 3');
  console.log(JSON.stringify(runs.rows));
}
await pool.end();
