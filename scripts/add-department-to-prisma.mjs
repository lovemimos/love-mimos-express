import fs from "node:fs";

const file = "./prisma/schema.prisma";
const backup = "./prisma/schema.before-department-safe.prisma";

if (!fs.existsSync(file)) {
  console.error("ERRO: prisma/schema.prisma nao encontrado");
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");
fs.copyFileSync(file, backup);

if (!/model\s+Product\s*\{/.test(s)) {
  console.error("ERRO: model Product nao encontrado");
  process.exit(1);
}

if (!/model\s+Category\s*\{/.test(s)) {
  console.error("ERRO: model Category nao encontrado");
  process.exit(1);
}

if (!/\bdepartmentId\s+String\?/.test(s)) {
  const re = /(\n\s*categoryId\s+String\?[^\n]*\n)/;

  if (!re.test(s)) {
    console.error("ERRO: campo categoryId do Product nao encontrado");
    process.exit(1);
  }

  s = s.replace(
    re,
    `$1  departmentId String?\n  department Department? @relation(fields: [departmentId], references: [id])\n`
  );
}

if (!/@@index\(\[departmentId\]\)/.test(s)) {
  const idx = /(\n\s*@@index\(\[categoryId\]\)[^\n]*\n)/;

  if (idx.test(s)) {
    s = s.replace(idx, `$1  @@index([departmentId])\n`);
  }
}

if (!/model\s+Department\s*\{/.test(s)) {
  s = s.trimEnd() + `

model Department {
  id        String    @id @default(cuid())
  name      String    @unique
  slug      String    @unique
  products  Product[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
`;
}

fs.writeFileSync(file, s, "utf8");

console.log("OK: Department adicionado ao schema");
console.log("BANCO NAO FOI ALTERADO");
