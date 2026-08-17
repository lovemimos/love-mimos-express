/**
 * Formato bruto do produto retornado por `produto.obter.php` da API v2
 * da Tiny — diferente do formato v3 (`tiny-mapper.ts`): campos no nível
 * raiz em vez de aninhados, nomes de campo diferentes, e uma modelagem
 * de variação distinta (produtos "filhos" ligados por
 * `produto_pai_id`).
 *
 * **Nível de confiança por campo**: os nomes abaixo seguem o padrão
 * público e estável da API v2 da Tiny — mas nunca foram confirmados
 * nesta conversa contra um payload real. A página de validação
 * (`/dev/tiny-v2-product-mapping`) existe exatamente para essa
 * confirmação.
 */
import { extractUsableImageUrls } from "@/lib/repositories/tiny/tiny-v2-image-scanner";
import { sanitizeHtmlForDisplay } from "@/utils/sanitize-html-for-display";

export type TinyV2ProductPayload = {
  id: number | string;
  nome?: string;
  codigo?: string;
  unidade?: string;
  preco?: number | string | { preco?: number | string; venda?: number | string; valor?: number | string };
  preco_promocional?: number | string | { preco?: number | string; valor?: number | string };
  estoque?:
    | number
    | string
    | { saldo?: number | string; quantidade?: number | string; atual?: number | string; disponivel?: number | string }
    | { deposito?: unknown; saldo?: number | string; quantidade?: number | string }[];
  deposito?: unknown;
  depositos?: { saldo?: number | string; quantidade?: number | string; atual?: number | string }[];
  ncm?: string;
  gtin?: string;
  ean?: string;
  situacao?: string;
  categoria?: string;
  marca?: string;
  descricao?: string;
  descricao_complementar?: string;
  peso_bruto?: number | string;
  peso_liquido?: number | string;
  altura_embalagem?: number | string;
  largura_embalagem?: number | string;
  comprimento_embalagem?: number | string;
  anexos?: ({ url?: string; anexo?: { url?: string }; [key: string]: unknown } | string)[];
  variacoes?: { variacao?: { id?: number | string; nome?: string; grade_valor?: string } }[];
  [key: string]: unknown;
};

export type FieldStatusValue = "mapped" | "missing" | "incompatible";

/** Status de exatamente um dos 17 campos de negócio pedidos — a
 * estrutura única que a página de validação renderiza como tabela. */
export type FieldStatus = {
  key: string;
  label: string;
  status: FieldStatusValue;
  value?: unknown;
  rawValue?: unknown;
  note?: string;
};

export type TinyV2MappingResult = {
  mapped: Record<string, unknown>;
  fieldStatuses: FieldStatus[];
  imagesNote: string;
  stockNote: string;
  variantsNote: string;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * `preco`/`preco_promocional` podem vir como número/string direto
 * (formato plano, o que assumíamos originalmente) OU como um objeto
 * aninhado — confirmado como um problema real: contas onde o valor
 * veio aninhado resultavam em "preco não retornado" e o produto caía
 * para R$ 0,00. A API v3 (já confirmada neste projeto) aninha
 * `estoque.quantidade`, então o mesmo padrão é uma hipótese razoável
 * para a v2 — tentamos as duas formas, nunca inventamos um valor.
 */
function extractPrice(value: TinyV2ProductPayload["preco"]): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return toNumber(value.preco ?? value.venda ?? value.valor);
  return toNumber(value);
}

function extractStock(value: TinyV2ProductPayload["estoque"]): number | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    // Estoque por depósito — soma o saldo de todos, já que o valor
    // consolidado é o que importa para "tem ou não tem estoque".
    const total = value.reduce((sum, item) => {
      const n = toNumber(item.saldo ?? item.quantidade);
      return sum + (n ?? 0);
    }, 0);
    return value.length > 0 ? total : null;
  }
  if (typeof value === "object") {
    return toNumber(value.saldo ?? value.quantidade ?? value.atual ?? value.disponivel);
  }
  return toNumber(value);
}

/** Fallback quando `estoque` não rendeu nada, mas o payload tem um
 * campo `depositos` separado no nível raiz — mesma lógica de soma. */
function extractStockFromDeposits(depositos: TinyV2ProductPayload["depositos"]): number | null {
  if (!Array.isArray(depositos) || depositos.length === 0) return null;
  const total = depositos.reduce((sum, item) => {
    const n = toNumber(item.saldo ?? item.quantidade ?? item.atual);
    return sum + (n ?? 0);
  }, 0);
  return total;
}

const KNOWN_CATEGORY_SLUGS = ["cilios", "colas", "pincas", "removedores", "higienizacao", "acessorios", "kits"];

function slugifyBasic(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Mapeia o payload bruto da Tiny v2 para o modelo `Product` — nunca faz
 * chamada HTTP, nunca decide sozinho gravar nada no catálogo. Devolve
 * o status de cada um dos 17 campos de negócio pedidos, sempre nesta
 * mesma ordem, para a página renderizar como tabela.
 */
export function mapTinyV2ProductToDomain(raw: TinyV2ProductPayload): TinyV2MappingResult {
  const mapped: Record<string, unknown> = {};
  const fieldStatuses: FieldStatus[] = [];

  function mappedStatus(key: string, label: string, value: unknown) {
    mapped[key] = value;
    fieldStatuses.push({ key, label, status: "mapped", value });
  }
  function missingStatus(key: string, label: string, note: string) {
    fieldStatuses.push({ key, label, status: "missing", note });
  }
  function incompatibleStatus(key: string, label: string, rawValue: unknown, note: string) {
    fieldStatuses.push({ key, label, status: "incompatible", rawValue, note });
  }

  const externalRef = { source: "tiny", id: String(raw.id) };
  mappedStatus("externalRef", "ID externo do Tiny", externalRef);

  if (raw.nome?.trim()) mappedStatus("name", "Nome", raw.nome.trim());
  else missingStatus("name", "Nome", 'Campo "nome" não veio preenchido na Tiny');

  const rawDescription = (raw.descricao_complementar || raw.descricao)?.trim();
  const description = rawDescription ? sanitizeHtmlForDisplay(rawDescription) : undefined;
  if (description) mappedStatus("description", "Descrição", description);
  else missingStatus("description", "Descrição", 'Nem "descricao" nem "descricao_complementar" vieram preenchidos');

  if (raw.codigo?.trim()) mappedStatus("sku", "SKU/código", raw.codigo.trim());
  else missingStatus("sku", "SKU/código", 'Campo "codigo" não veio preenchido na Tiny');

  const gtinValue = raw.gtin?.trim() || raw.ean?.trim();
  if (gtinValue) mappedStatus("barcode", "GTIN/EAN", gtinValue);
  else missingStatus("barcode", "GTIN/EAN", 'Nem "gtin" nem "ean" vieram preenchidos');

  const price = extractPrice(raw.preco);
  const promoPrice = extractPrice(raw.preco_promocional);
  const hasRealPromo = promoPrice !== null && price !== null && promoPrice < price;
  const effectivePrice = hasRealPromo ? promoPrice : price;
  if (effectivePrice !== null) mappedStatus("price", "Preço", effectivePrice);
  else missingStatus("price", "Preço", 'Campo "preco" não veio preenchido, nem como número direto nem como objeto aninhado ({preco, venda ou valor})');

  if (hasRealPromo) mappedStatus("compareAtPrice", "Preço promocional", price);
  else
    missingStatus(
      "compareAtPrice",
      "Preço promocional",
      "Sem promoção ativa para este produto (esperado quando não há preço promocional)"
    );

  const stock = extractStock(raw.estoque) ?? extractStockFromDeposits(raw.depositos);
  if (stock !== null) mappedStatus("stock", "Estoque", stock);
  else missingStatus("stock", "Estoque", 'Campo "estoque" não veio preenchido, nem como número direto nem como objeto aninhado ({saldo, quantidade, atual ou disponivel})');

  if (raw.unidade?.trim()) mappedStatus("unit", "Unidade", raw.unidade.trim());
  else missingStatus("unit", "Unidade", 'Campo "unidade" não veio preenchido');

  if (raw.categoria?.trim()) {
    const slug = slugifyBasic(raw.categoria);
    if (KNOWN_CATEGORY_SLUGS.includes(slug)) {
      mappedStatus("categorySlug", "Categoria", slug);
    } else {
      mapped.categorySlug = slug;
      incompatibleStatus(
        "categorySlug",
        "Categoria",
        raw.categoria,
        `Categoria "${raw.categoria}" (slug: "${slug}") não corresponde a nenhuma das 7 categorias principais (${KNOWN_CATEGORY_SLUGS.join(", ")}) — precisaria de mapeamento manual, igual foi feito para a Nuvemshop`
      );
    }
  } else {
    missingStatus("categorySlug", "Categoria", 'Campo "categoria" não veio preenchido');
  }

  if (raw.marca?.trim()) mappedStatus("brandSlug", "Marca", slugifyBasic(raw.marca));
  else missingStatus("brandSlug", "Marca", 'Campo "marca" não veio preenchido');

  let imagesNote: string;
  const scannedUrls = extractUsableImageUrls(raw);

  if (Array.isArray(raw.anexos) && raw.anexos.length > 0) {
    const flatUrls = raw.anexos
      .map((a) => (typeof a === "string" ? a : a.url))
      .filter((u): u is string => Boolean(u));
    const nestedUrls = raw.anexos
      .map((a) => (typeof a === "object" && a.anexo ? a.anexo.url : undefined))
      .filter((u): u is string => Boolean(u));
    const directUrls = flatUrls.length > 0 ? flatUrls : nestedUrls;

    if (directUrls.length > 0) {
      mappedStatus("images", "Imagens", directUrls);
      imagesNote = `${directUrls.length} imagem(ns) com URL direta encontrada(s) em "anexos" — nenhuma chamada complementar necessária.`;
    } else if (scannedUrls.length > 0) {
      mapped.images = scannedUrls;
      incompatibleStatus(
        "images",
        "Imagens",
        raw.anexos,
        'O caminho esperado ("anexos[].url") não tinha URL, mas uma varredura completa do payload encontrou imagem(ns) em outro formato — ver docs/features/tiny-v2-image-resolution.md.'
      );
      imagesNote = `"anexos" não tinha URL direta, mas a varredura completa do payload encontrou ${scannedUrls.length} imagem(ns) em outro lugar do JSON — usadas como fallback. Vale confirmar se esse é mesmo o campo certo.`;
    } else {
      mapped.images = [];
      incompatibleStatus("images", "Imagens", raw.anexos, 'A Tiny retornou item(ns) em "anexos", mas sem URL utilizável (só IDs) — precisa de chamada complementar.');
      imagesNote = `A Tiny retornou ${raw.anexos.length} item(ns) em "anexos", mas só com ID, sem URL — é necessária a chamada complementar GET /produtos/{id}/anexos (endpoint confirmado na API v3, ver docs/API_TINY.md) para obter a URL real.`;
    }
  } else if (scannedUrls.length > 0) {
    mapped.images = scannedUrls;
    incompatibleStatus(
      "images",
      "Imagens",
      undefined,
      'Não havia nenhum campo "anexos", mas uma varredura completa do payload encontrou imagem(ns) em outro lugar do JSON.'
    );
    imagesNote = `Não havia "anexos", mas a varredura completa do payload encontrou ${scannedUrls.length} imagem(ns) em outro formato — usadas como fallback.`;
  } else {
    mapped.images = [];
    missingStatus("images", "Imagens", 'Nenhum item em "anexos" neste payload, e a varredura completa não encontrou nenhuma imagem em nenhum lugar');
    imagesNote =
      'A Tiny não retornou nenhuma imagem para este produto, em nenhum formato conhecido — pode ser porque o produto realmente não tem imagem, ou porque é necessária a chamada complementar GET /produtos/{id}/anexos (API v3, ver docs/API_TINY.md).';
  }

  const stockNote =
    raw.depositos !== undefined || raw.deposito !== undefined
      ? 'O payload traz informação de depósito(s) — o estoque foi somado entre todos os depósitos encontrados (em "estoque" e/ou "depositos"). Se o valor consolidado ainda parecer errado, considerar uma chamada complementar a um endpoint de estoque dedicado (ex.: produto.obter.estoque.php).'
      : 'Nenhum sinal de múltiplos depósitos neste payload — o campo "estoque" provavelmente é confiável como está.';

  const weight = toNumber(raw.peso_bruto) ?? toNumber(raw.peso_liquido);
  if (weight !== null) mappedStatus("weight", "Peso", weight);
  else missingStatus("weight", "Peso", 'Nem "peso_bruto" nem "peso_liquido" vieram preenchidos');

  const height = toNumber(raw.altura_embalagem);
  const width = toNumber(raw.largura_embalagem);
  const length = toNumber(raw.comprimento_embalagem);
  if (height !== null && width !== null && length !== null) {
    mappedStatus("dimensions", "Dimensões", { height, width, length });
  } else if (
    raw.altura_embalagem !== undefined ||
    raw.largura_embalagem !== undefined ||
    raw.comprimento_embalagem !== undefined
  ) {
    incompatibleStatus(
      "dimensions",
      "Dimensões",
      { altura: raw.altura_embalagem, largura: raw.largura_embalagem, comprimento: raw.comprimento_embalagem },
      "Nem todas as três dimensões vieram preenchidas"
    );
  } else {
    missingStatus("dimensions", "Dimensões", "Nenhum campo de dimensão veio preenchido");
  }

  if (raw.ncm?.trim()) mappedStatus("ncm", "NCM", raw.ncm.trim());
  else missingStatus("ncm", "NCM", 'Campo "ncm" não veio preenchido');

  if (raw.situacao) {
    if (raw.situacao === "A") {
      mappedStatus("situacao", "Status", raw.situacao);
    } else {
      mapped.situacao = raw.situacao;
      incompatibleStatus(
        "situacao",
        "Status",
        raw.situacao,
        'Produto não está com situação "A" (ativo) — não deveria ser importado para o catálogo publicado'
      );
    }
  } else {
    missingStatus("situacao", "Status", 'Campo "situacao" não veio preenchido');
  }

  let variantsNote: string;
  if (Array.isArray(raw.variacoes) && raw.variacoes.length > 0) {
    const variants = raw.variacoes.map((v) => ({
      id: String(v.variacao?.id ?? ""),
      label: v.variacao?.nome || v.variacao?.grade_valor || "Variação",
      externalRef: { source: "tiny", id: String(v.variacao?.id ?? "") },
    }));
    const hasUsableLabels = variants.every((v) => v.label !== "Variação");
    if (hasUsableLabels) {
      mappedStatus("variants", "Variações", variants);
      variantsNote = `${variants.length} variação(ões) com nome/valor de grade preenchido — id da Tiny preservado em cada uma.`;
    } else {
      mapped.variants = variants;
      incompatibleStatus("variants", "Variações", raw.variacoes, "Variação sem nome/grade legível");
      variantsNote = `${variants.length} variação(ões) encontrada(s), mas sem nome/valor de grade em pelo menos uma — a API v2 costuma tratar cada variação como um "produto filho" separado (ligado por produto_pai_id); provavelmente é necessária uma chamada complementar por ID de variação para obter o nome completo.`;
    }
  } else {
    missingStatus("variants", "Variações", 'Nenhum item em "variacoes" neste payload');
    variantsNote =
      'Este payload não trouxe nenhum item em "variacoes" — ou o produto realmente não tem variação, ou (mais provável) as variações são "produtos filhos" separados, exigindo uma consulta adicional por produto_pai_id para localizá-las.';
  }

  return { mapped, fieldStatuses, imagesNote, stockNote, variantsNote };
}
