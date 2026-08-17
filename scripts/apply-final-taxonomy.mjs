import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CSV = path.join(ROOT, "reports", "tiny-classification-final.csv");
const PRISMA_FILE = path.join(ROOT, "src", "lib", "db", "prisma.ts");

function csvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];

    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }

  out.push(cur);
  return out;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("\n==============================================");
  console.log(" LOVE MIMOS - APLICACAO FINAL DE TAXONOMIA");
  console.log("==============================================");

  if (!fs.existsSync(CSV)) {
    throw new Error("Arquivo reports/tiny-classification-final.csv nao encontrado.");
  }

  if (!fs.existsSync(PRISMA_FILE)) {
    throw new Error("src/lib/db/prisma.ts nao encontrado.");
  }

  const raw = fs.readFileSync(CSV, "utf8")
    .replace(/^\uFEFF/, "")
    .trim();

  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = csvLine(lines[0]);

  const index = Object.fromEntries(headers.map((h, i) => [h, i]));

  const required = [
    "tinyId",
    "nome",
    "departamentoProposto",
    "categoriaProposta",
    "decisao"
  ];

  for (const field of required) {
    if (index[field] === undefined) {
      throw new Error(`Coluna obrigatoria ausente no CSV: ${field}`);
    }
  }

  const rows = lines.slice(1).map(csvLine).map(r => ({
    tinyId: String(r[index.tinyId] || "").trim(),
    nome: String(r[index.nome] || "").trim(),
    departamento: String(r[index.departamentoProposto] || "").trim(),
    categoria: String(r[index.categoriaProposta] || "").trim(),
    decisao: String(r[index.decisao] || "").trim()
  }));

  const invalid = rows.filter(
    r =>
      !r.tinyId ||
      !r.departamento ||
      !r.categoria ||
      r.decisao === "REVISAR_MANUALMENTE"
  );

  if (invalid.length) {
    console.error(`ERRO: ${invalid.length} linhas ainda nao estao prontas.`);
    console.error(invalid.slice(0, 20));
    process.exit(2);
  }

  console.log(`CSV OK: ${rows.length} produtos classificados.`);

  const prismaModule = await import(
    new URL("../src/lib/db/prisma.ts", import.meta.url).href
  );

  const prisma =
    Object.values(prismaModule).find(
      v =>
        v &&
        typeof v === "object" &&
        v.product &&
        v.category &&
        v.department
    );

  if (!prisma) {
    throw new Error(
      "Nao foi possivel localizar automaticamente o Prisma Client exportado por src/lib/db/prisma.ts."
    );
  }

  console.log("Prisma Client localizado automaticamente.");

  const tinyIds = [...new Set(rows.map(r => r.tinyId))];

  const existing = await prisma.product.findMany({
    where: {
      tinyId: {
        in: tinyIds
      }
    },
    select: {
      id: true,
      tinyId: true,
      name: true,
      categoryId: true,
      departmentId: true
    }
  });

  const existingByTiny = new Map(
    existing.map(p => [String(p.tinyId), p])
  );

  const unmatched = rows.filter(r => !existingByTiny.has(r.tinyId));
  const matched = rows.filter(r => existingByTiny.has(r.tinyId));

  console.log(`Encontrados no banco: ${matched.length}`);
  console.log(`Nao encontrados no banco: ${unmatched.length}`);

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const backupPath = path.join(
    ROOT,
    "reports",
    `taxonomy-backup-${stamp}.json`
  );

  fs.writeFileSync(
    backupPath,
    JSON.stringify(existing, null, 2),
    "utf8"
  );

  console.log(`Backup criado: ${backupPath}`);

  const departmentNames = [
    ...new Set(matched.map(r => r.departamento))
  ];

  const categoryNames = [
    ...new Set(matched.map(r => r.categoria))
  ];

  const departments = new Map();

  for (const name of departmentNames) {
    const slug = slugify(name);

    const item = await prisma.department.upsert({
      where: { slug },
      create: {
        name,
        slug
      },
      update: {
        name
      }
    });

    departments.set(name, item);
  }

  const categories = new Map();

  for (const name of categoryNames) {
    const slug = slugify(name);

    const item = await prisma.category.upsert({
      where: { slug },
      create: {
        name,
        slug
      },
      update: {
        name
      }
    });

    categories.set(name, item);
  }

  console.log(`Departamentos preparados: ${departments.size}`);
  console.log(`Categorias preparadas: ${categories.size}`);

  const operations = matched.map(row => {
    const product = existingByTiny.get(row.tinyId);
    const department = departments.get(row.departamento);
    const category = categories.get(row.categoria);

    return prisma.product.update({
      where: {
        id: product.id
      },
      data: {
        departmentId: department.id,
        categoryId: category.id
      }
    });
  });

  console.log(`Aplicando taxonomia em ${operations.length} produtos...`);

  
const BATCH_SIZE = 20;

for (let i = 0; i < operations.length; i += BATCH_SIZE) {
  const batch = operations.slice(i, i + BATCH_SIZE);

  await Promise.all(batch);

  console.log(
    `LOTE ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(operations.length / BATCH_SIZE)} GRAVADO - ${Math.min(i + BATCH_SIZE, operations.length)}/${operations.length}`
  );
}


  const verified = await prisma.product.findMany({
    where: {
      tinyId: {
        in: matched.map(r => r.tinyId)
      }
    },
    select: {
      tinyId: true,
      department: {
        select: {
          name: true
        }
      },
      category: {
        select: {
          name: true
        }
      }
    }
  });

  let errors = 0;
  const expected = new Map(
    matched.map(r => [
      r.tinyId,
      `${r.departamento}|||${r.categoria}`
    ])
  );

  for (const p of verified) {
    const actual =
      `${p.department?.name || ""}|||${p.category?.name || ""}`;

    if (actual !== expected.get(String(p.tinyId))) {
      errors++;
    }
  }

  const deptCounts = {};

  for (const p of verified) {
    const name = p.department?.name || "SEM DEPARTAMENTO";
    deptCounts[name] = (deptCounts[name] || 0) + 1;
  }

  const report = {
    totalCSV: rows.length,
    encontradosBanco: matched.length,
    naoEncontradosBanco: unmatched.length,
    atualizados: verified.length,
    errosValidacao: errors,
    departamentos: deptCounts,
    naoEncontrados: unmatched
  };

  const reportPath = path.join(
    ROOT,
    "reports",
    "taxonomy-apply-result.json"
  );

  fs.writeFileSync(
    reportPath,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  console.log("\n==============================================");
  console.log(" RESULTADO");
  console.log("==============================================");
  console.log(`TOTAL CSV: ${rows.length}`);
  console.log(`ENCONTRADOS: ${matched.length}`);
  console.log(`ATUALIZADOS: ${verified.length}`);
  console.log(`NAO ENCONTRADOS: ${unmatched.length}`);
  console.log(`ERROS DE VALIDACAO: ${errors}`);

  console.log("\nPOR DEPARTAMENTO:");

  for (const [name, count] of Object.entries(deptCounts)) {
    console.log(`${name}: ${count}`);
  }

  console.log(`\nRELATORIO: ${reportPath}`);

  if (errors > 0) {
    console.error("\nFALHA: houve divergencia depois da gravacao.");
    process.exitCode = 3;
  } else {
    console.log("\n✅ TAXONOMIA APLICADA E VALIDADA.");
  }

  await prisma.$disconnect?.();
}

main().catch(err => {
  console.error("\n❌ TAXONOMY_FATAL_ERROR");
  console.error(err);
  process.exit(1);
});
