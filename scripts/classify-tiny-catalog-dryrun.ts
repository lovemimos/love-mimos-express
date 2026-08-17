import fs from "node:fs/promises";

const INPUT_JSON = "./reports/tiny-scope-audit.json";
const OUTPUT_CSV = "./reports/tiny-classification-dryrun.csv";
const OUTPUT_JSON = "./reports/tiny-classification-dryrun.json";

type Row = {
  tinyId: string;
  nome: string;
  categoria: string;
  status?: string;
  motivo?: string;
};

type Decision = {
  tinyId: string;
  nome: string;
  categoriaTiny: string;
  departamentoProposto: string;
  categoriaProposta: string;
  confianca: "ALTA" | "MEDIA" | "BAIXA";
  decisao: "AUTO_APROVADO" | "REVISAR_MANUALMENTE";
  motivo: string;
};

const norm = (s:string) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function includesAny(text:string, terms:string[]) {
  return terms.some(t => text.includes(t));
}

function classify(row: Row): Decision {
  const nome = row.nome || "";
  const categoria = row.categoria || "(SEM CATEGORIA)";
  const t = norm(`${categoria} ${nome}`);

  // 1) Departamentos explícitos da Tiny: máxima confiança.
  if (norm(categoria).startsWith("lash designer")) {
    let cat = "Acessórios";

    if (includesAny(t, ["cilios", "cílios", "lash tray", "fio a fio", "volume brasileiro", "volume egipcio", "volume russo", "tufo"])) {
      cat = "Cílios";
    } else if (includesAny(t, ["cola", "adesivo", "glue", "acelerador de secagem"])) {
      cat = "Colas e Adesivos";
    } else if (includesAny(t, ["pinca", "pinça", "tweezer"])) {
      cat = "Pinças";
    } else if (includesAny(t, ["removedor", "remover", "remocao", "remoção"])) {
      cat = "Removedores";
    } else if (includesAny(t, ["higien", "shampoo", "espuma", "cleanser", "primer"])) {
      cat = "Higienização";
    } else if (includesAny(t, ["kit", "combo"])) {
      cat = "Kits";
    }

    return {
      tinyId: row.tinyId,
      nome,
      categoriaTiny: categoria,
      departamentoProposto: "Lash Designer",
      categoriaProposta: cat,
      confianca: "ALTA",
      decisao: "AUTO_APROVADO",
      motivo: "Categoria Tiny já pertence à árvore Lash Designer."
    };
  }

  if (norm(categoria).startsWith("nail designer")) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Nail Designer",
      categoriaProposta: "Nail Designer",
      confianca: "ALTA",
      decisao: "AUTO_APROVADO",
      motivo: "Categoria Tiny já pertence à árvore Nail Designer."
    };
  }

  if (norm(categoria).startsWith("sobrancelha")) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Sobrancelhas",
      categoriaProposta: "Sobrancelhas",
      confianca: "ALTA",
      decisao: "AUTO_APROVADO",
      motivo: "Categoria Tiny já pertence à árvore Sobrancelha."
    };
  }

  if (norm(categoria).startsWith("maquiagem")) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Maquiagem",
      categoriaProposta: "Maquiagem",
      confianca: "ALTA",
      decisao: "AUTO_APROVADO",
      motivo: "Categoria Tiny já pertence à árvore Maquiagem."
    };
  }

  // 2) Sem categoria/ambíguos: inferência conservadora pelo nome.
  if (includesAny(t, [
    "cilios", "cílios", "lash", "decemars", "fadvan", "nagaraku", "maria sasha",
    "5d", "4d", "3d", "6d", "yy", "volume brasileiro", "volume egipcio", "volume russo"
  ])) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Lash Designer",
      categoriaProposta: "Cílios",
      confianca: "MEDIA",
      decisao: "AUTO_APROVADO",
      motivo: "Nome contém sinais fortes de produto para extensão de cílios."
    };
  }

  if (includesAny(t, ["cola ", "adesivo", "glue", "cherry one", "sky rose", "aurora", "luna clione", "hs16", "ruby"])) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Lash Designer",
      categoriaProposta: "Colas e Adesivos",
      confianca: "MEDIA",
      decisao: "AUTO_APROVADO",
      motivo: "Nome contém sinais fortes de adesivo/cola para lash."
    };
  }

  if (includesAny(t, ["removedor", "remover", "remocao", "remoção"])) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Lash Designer",
      categoriaProposta: "Removedores",
      confianca: "MEDIA",
      decisao: "AUTO_APROVADO",
      motivo: "Nome indica removedor."
    };
  }

  if (includesAny(t, ["pinca", "pinça", "tweezer"])) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Lash Designer",
      categoriaProposta: "Pinças",
      confianca: "MEDIA",
      decisao: "AUTO_APROVADO",
      motivo: "Nome indica pinça; validar manualmente apenas se for ferramenta de outra linha."
    };
  }

  if (includesAny(t, ["shampoo", "higien", "cleanser", "primer", "espuma de limpeza"])) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Lash Designer",
      categoriaProposta: "Higienização",
      confianca: "MEDIA",
      decisao: "AUTO_APROVADO",
      motivo: "Nome indica preparação/higienização lash."
    };
  }

  if (includesAny(t, ["gel construtor", "alongamento de unhas", "unha", "unhas", "nail", "esmalte", "acetona", "cabine led", "cabine uv", "polygel"])) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Nail Designer",
      categoriaProposta: "Nail Designer",
      confianca: "MEDIA",
      decisao: "AUTO_APROVADO",
      motivo: "Nome contém sinais fortes de produto para unhas."
    };
  }

  if (includesAny(t, ["sobrancelha", "henna", "brow"])) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Sobrancelhas",
      categoriaProposta: "Sobrancelhas",
      confianca: "MEDIA",
      decisao: "AUTO_APROVADO",
      motivo: "Nome contém sinais fortes de produto para sobrancelhas."
    };
  }

  if (includesAny(t, ["maquiagem", "batom", "base", "corretivo", "rimel", "rímel", "make"])) {
    return {
      tinyId: row.tinyId, nome, categoriaTiny: categoria,
      departamentoProposto: "Maquiagem",
      categoriaProposta: "Maquiagem",
      confianca: "MEDIA",
      decisao: "AUTO_APROVADO",
      motivo: "Nome contém sinais fortes de maquiagem."
    };
  }

  return {
    tinyId: row.tinyId,
    nome,
    categoriaTiny: categoria,
    departamentoProposto: "Revisar",
    categoriaProposta: "Revisar",
    confianca: "BAIXA",
    decisao: "REVISAR_MANUALMENTE",
    motivo: "Sem sinal suficiente para classificar automaticamente sem risco."
  };
}

function esc(v:any) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

async function main() {
  const raw = await fs.readFile(INPUT_JSON, "utf8");
  const rows: Row[] = JSON.parse(raw);
  const out = rows.map(classify);

  const csv = [
    ["tinyId","nome","categoriaTiny","departamentoProposto","categoriaProposta","confianca","decisao","motivo"].map(esc).join(","),
    ...out.map(r => [
      r.tinyId,r.nome,r.categoriaTiny,r.departamentoProposto,r.categoriaProposta,
      r.confianca,r.decisao,r.motivo
    ].map(esc).join(","))
  ].join("\n");

  await fs.writeFile(OUTPUT_CSV, csv, "utf8");
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(out, null, 2), "utf8");

  const auto = out.filter(x => x.decisao === "AUTO_APROVADO").length;
  const revisar = out.length - auto;
  const dept = new Map<string, number>();
  for (const x of out) dept.set(x.departamentoProposto, (dept.get(x.departamentoProposto) ?? 0) + 1);

  console.log("\n========================================");
  console.log(" DRY-RUN DE CLASSIFICACAO LOVE MIMOS");
  console.log("========================================");
  console.log(`TOTAL: ${out.length}`);
  console.log(`AUTO_APROVADO: ${auto}`);
  console.log(`REVISAR_MANUALMENTE: ${revisar}`);
  console.log("");
  console.log("POR DEPARTAMENTO:");
  for (const [k,v] of [...dept.entries()].sort((a,b)=>b[1]-a[1])) {
    console.log(`${k}: ${v}`);
  }
  console.log("");
  console.log(`RELATORIO: ${OUTPUT_CSV}`);
  console.log("NADA FOI ALTERADO NO BANCO.");
}

main().catch(err => {
  console.error("CLASSIFICATION_DRYRUN_FATAL_ERROR");
  console.error(err);
  process.exit(1);
});
