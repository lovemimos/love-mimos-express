import fs from "node:fs/promises";

const INPUT = "./reports/tiny-classification-dryrun.csv";
const OUTPUT = "./reports/tiny-classification-final.csv";

function parseCsvLine(line:string){
  const out:string[]=[]; let cur=""; let q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c === '"'){
      if(q && line[i+1] === '"'){ cur+='"'; i++; }
      else q=!q;
    } else if(c === "," && !q){ out.push(cur); cur=""; }
    else cur+=c;
  }
  out.push(cur);
  return out;
}

function esc(v:any){ return `"${String(v ?? "").replace(/"/g,'""')}"`; }

function norm(s:string){
  return (s||"").normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().replace(/\s+/g," ").trim();
}

const manualRules: Array<{match:(n:string)=>boolean; dept:string; cat:string}> = [
  { match:n=>n.includes("anel batoque sem divisoria"), dept:"Lash Designer", cat:"Acessórios para Cola" },
  { match:n=>n.includes("boneca treino"), dept:"Lash Designer", cat:"Treino e Prática" },
  { match:n=>n.includes("copo dappen"), dept:"Profissional / Acessórios Gerais", cat:"Recipientes e Utensílios" },
  { match:n=>n.includes("espelho de mao"), dept:"Profissional / Acessórios Gerais", cat:"Espelhos" },
  { match:n=>n.includes("espelho de precisao"), dept:"Profissional / Acessórios Gerais", cat:"Espelhos" },
  { match:n=>n.includes("fita japonesa fina"), dept:"Lash Designer", cat:"Fitas e Isolamento" },
  { match:n=>n.includes("fita para levantar palpebra"), dept:"Lash Designer", cat:"Fitas e Isolamento" },
  { match:n=>n.includes("fita transpore"), dept:"Lash Designer", cat:"Fitas e Isolamento" },
  { match:n=>n.includes("higrometro digital"), dept:"Lash Designer", cat:"Controle de Ambiente" },
  { match:n=>n.includes("iluminador led tomate"), dept:"Profissional / Acessórios Gerais", cat:"Iluminação" },
  { match:n=>n.includes("kit 3 navalhas"), dept:"Sobrancelhas", cat:"Navalhas" },
  { match:n=>n.includes("kit navalha 3 unidades"), dept:"Sobrancelhas", cat:"Navalhas" },
  { match:n=>n.includes("lente macro"), dept:"Profissional / Acessórios Gerais", cat:"Fotografia e Conteúdo" },
  { match:n=>n.includes("mascara descartavel"), dept:"Profissional / Acessórios Gerais", cat:"Descartáveis" },
  { match:n=>n.includes("mascara hidratante labial"), dept:"Lash Designer", cat:"Conforto da Cliente" },
  { match:n=>n.includes("mini kit retencao cherry"), dept:"Lash Designer", cat:"Preparação e Retenção" },
  { match:n=>n.includes("mousse de limpeza power"), dept:"Lash Designer", cat:"Higienização" },
  { match:n=>n.includes("nano mister"), dept:"Lash Designer", cat:"Acessórios" },
  { match:n=>n.includes("pad 25 pares"), dept:"Lash Designer", cat:"Pads" },
  { match:n=>n.includes("pad 50 unidades"), dept:"Lash Designer", cat:"Pads" },
  { match:n=>n.includes("pedra jade"), dept:"Lash Designer", cat:"Acessórios para Cola" },
  { match:n=>n.includes("pincel aplicador gloss"), dept:"Profissional / Acessórios Gerais", cat:"Descartáveis" },
  { match:n=>n.includes("plastico filme"), dept:"Profissional / Acessórios Gerais", cat:"Descartáveis" },
  { match:n=>n.includes("pote hermetico com higrometro"), dept:"Lash Designer", cat:"Armazenamento de Cola" },
  { match:n=>n.includes("ring light"), dept:"Profissional / Acessórios Gerais", cat:"Iluminação" },
  { match:n=>n.includes("silica 100g"), dept:"Lash Designer", cat:"Armazenamento de Cola" },
  { match:n=>n.includes("tesoura modelo passaro"), dept:"Profissional / Acessórios Gerais", cat:"Ferramentas" },
  { match:n=>n.includes("tesoura pequena"), dept:"Profissional / Acessórios Gerais", cat:"Ferramentas" },
  { match:n=>n.includes("ventilador de mao"), dept:"Lash Designer", cat:"Acessórios" },
];

async function main(){
  const raw = await fs.readFile(INPUT,"utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(headers.map((h,i)=>[h,i]));

  const rows = lines.slice(1).map(parseCsvLine);
  let patched=0;

  for(const row of rows){
    if(row[idx.decisao] !== "REVISAR_MANUALMENTE") continue;
    const n = norm(row[idx.nome]);
    const rule = manualRules.find(r=>r.match(n));
    if(!rule) continue;

    row[idx.departamentoProposto] = rule.dept;
    row[idx.categoriaProposta] = rule.cat;
    row[idx.confianca] = "ALTA";
    row[idx.decisao] = "AUTO_APROVADO";
    row[idx.motivo] = "Classificação manual aprovada.";
    patched++;
  }

  const pending = rows.filter(r=>r[idx.decisao] === "REVISAR_MANUALMENTE");

  const out = [
    headers.map(esc).join(","),
    ...rows.map(r=>r.map(esc).join(","))
  ].join("\n");

  await fs.writeFile(OUTPUT,out,"utf8");

  console.log("========================================");
  console.log(" CLASSIFICACAO FINAL LOVE MIMOS");
  console.log("========================================");
  console.log(`TOTAL: ${rows.length}`);
  console.log(`AJUSTES MANUAIS APLICADOS: ${patched}`);
  console.log(`PENDENTES: ${pending.length}`);
  console.log(`ARQUIVO: ${OUTPUT}`);
  console.log("BANCO NAO FOI ALTERADO.");
  if(pending.length){
    console.log("\nPENDENTES:");
    for(const r of pending) console.log(`${r[idx.tinyId]} | ${r[idx.nome]}`);
    process.exitCode = 2;
  }
}

main().catch(err=>{
  console.error("FINALIZE_CLASSIFICATION_FATAL_ERROR");
  console.error(err);
  process.exit(1);
});
