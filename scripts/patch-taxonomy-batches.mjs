import fs from "node:fs";

const file = "./scripts/apply-final-taxonomy.mjs";
let s = fs.readFileSync(file, "utf8");

const re = /await\s+prisma\.\$transaction\(operations\);/;

if (!re.test(s)) {
  console.error("ERRO: ponto de gravacao original nao encontrado.");
  process.exit(1);
}

s = s.replace(re, `
const BATCH_SIZE = 20;

for (let i = 0; i < operations.length; i += BATCH_SIZE) {
  const batch = operations.slice(i, i + BATCH_SIZE);

  await Promise.all(batch);

  console.log(
    \`LOTE \${Math.floor(i / BATCH_SIZE) + 1}/\${Math.ceil(operations.length / BATCH_SIZE)} GRAVADO - \${Math.min(i + BATCH_SIZE, operations.length)}/\${operations.length}\`
  );
}
`);

fs.writeFileSync(file, s, "utf8");
console.log("SCRIPT CORRIGIDO: gravacao em lotes sem transaction timeout.");
