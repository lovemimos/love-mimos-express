// @ts-nocheck
import { loadEnvConfig } from "@next/env";
import fs from "node:fs/promises";

loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });

const token = process.env.TINY_API_TOKEN;
if (!token) throw new Error("TINY_API_TOKEN ausente");

const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));

async function tiny(endpoint:string, data:Record<string,string>) {
  const body = new URLSearchParams({ token, formato:"JSON", ...data });
  const res = await fetch(`https://api.tiny.com.br/api2/${endpoint}`, {
    method:"POST",
    headers:{ "content-type":"application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Tiny HTTP ${res.status}`);
  return res.json();
}

function getCategory(p:any): string {
  const c = p?.categoria;
  if (typeof c === "string" && c.trim()) return c.trim();
  if (c && typeof c === "object") {
    const v = c.descricao ?? c.nome ?? c.nomeCategoria ?? c.categoria;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const alt = p?.nome_categoria ?? p?.categoria_descricao;
  if (typeof alt === "string" && alt.trim()) return alt.trim();
  return "(SEM CATEGORIA)";
}

function classify(category:string) {
  const n = category.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  if (n.startsWith("lash designer")) {
    return { status:"INCLUIR", reason:"subarvore Lash Designer" };
  }

  if (
    n.startsWith("nail designer") ||
    n.startsWith("sobrancelha") ||
    n.startsWith("maquiagem")
  ) {
    return { status:"BLOQUEAR", reason:"fora do escopo lash" };
  }

  if (category === "(SEM CATEGORIA)") {
    return { status:"REVISAR", reason:"produto ativo sem categoria na Tiny" };
  }

  return { status:"REVISAR", reason:"categoria fora das regras seguras" };
}

async function main() {
  await fs.mkdir("./reports", { recursive:true });

  const rows:any[] = [];
  let page = 1;

  while (true) {
    const json:any = await tiny("produtos.pesquisa.php", {
      pagina:String(page),
      situacao:"A"
    });

    const retorno = json?.retorno;
    if (retorno?.status === "Erro") {
      if (retorno?.codigo_erro === 20) break;
      throw new Error(JSON.stringify(retorno));
    }

    const produtos = retorno?.produtos ?? [];
    if (!produtos.length) break;

    for (const item of produtos) {
      const id = item?.produto?.id;
      if (!id) continue;

      const detalhe:any = await tiny("produto.obter.php", { id:String(id) });
      const p = detalhe?.retorno?.produto ?? {};
      const category = getCategory(p);
      const decision = classify(category);

      rows.push({
        tinyId:String(id),
        nome:String(p?.nome ?? item?.produto?.nome ?? ""),
        categoria:category,
        status:decision.status,
        motivo:decision.reason
      });

      await sleep(3200);
    }

    console.log(`Pagina ${page} auditada: ${produtos.length}`);
    if (produtos.length < 100) break;
    page++;
    await sleep(3500);
  }

  const counts = rows.reduce((acc:any, r:any) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const esc = (v:any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    ["tinyId","nome","categoria","status","motivo"].map(esc).join(","),
    ...rows.map(r => [r.tinyId,r.nome,r.categoria,r.status,r.motivo].map(esc).join(","))
  ].join("\n");

  await fs.writeFile("./reports/tiny-scope-audit.csv", csv, "utf8");
  await fs.writeFile("./reports/tiny-scope-audit.json", JSON.stringify(rows, null, 2), "utf8");

  console.log("\n========================================");
  console.log(" AUDITORIA DE ESCOPO LOVE MIMOS");
  console.log("========================================");
  console.log(`TOTAL: ${rows.length}`);
  console.log(`INCLUIR: ${counts.INCLUIR ?? 0}`);
  console.log(`BLOQUEAR: ${counts.BLOQUEAR ?? 0}`);
  console.log(`REVISAR: ${counts.REVISAR ?? 0}`);
  console.log("RELATORIO: reports/tiny-scope-audit.csv");
  console.log("\nNada foi gravado ou apagado no banco.");
}

main().catch(err => {
  console.error("SCOPE_AUDIT_FATAL_ERROR");
  console.error(err);
  process.exit(1);
});


