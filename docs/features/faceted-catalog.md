# Feature: Catálogo Facetado

> Volta para [README.md](./README.md). Para o modelo de domínio completo
> e as decisões arquiteturais, ver
> [ARCHITECTURE_CATALOG.md](../ARCHITECTURE_CATALOG.md) — este
> documento é o complemento prático (como usar, o que já funciona, o
> que ainda falta).

## 1. O que mudou

O catálogo deixou de usar Categoria → Subcategoria (uma hierarquia
rígida) e passou a usar Categoria Principal (7 itens fixos) + Marca
(entidade própria) + Facetas abertas (`attributes`, 9 chaves conhecidas
hoje: linha, técnica, efeito, curvatura, espessura, comprimento, cor,
material, volume). Um produto pertence a quantos grupos fizer sentido
simultaneamente, sem duplicar o registro.

## 2. Como consultar por faceta

```ts
applyProductQuery(catalog, {
  categorySlug: "cilios",
  brandSlug: "maria-sasha",
  attributes: { cor: ["Preto", "Azul"], material: ["Seda"] },
  priceMin: 30,
  priceMax: 80,
});
```

`attributes` é `Record<string, string[]>` — múltiplos valores na mesma
faceta usam OU (`cor: ["Preto","Azul"]` mostra as duas cores); facetas
diferentes usam E (precisa bater cor E material). O filtro considera o
produto **e** suas variantes — ver
[ARCHITECTURE_CATALOG.md §4](../ARCHITECTURE_CATALOG.md#4-productvariantattributes--por-que-existe).

## 3. Registro de facetas — como adicionar uma nova

Uma linha em `src/lib/facets/registry.ts`:

```ts
{ key: "gramatura", label: "Gramatura", pluralLabel: "Gramaturas" }
```

Nenhuma outra mudança é necessária — `Product.attributes` já aceita
qualquer chave (é um `Record<string,string>` aberto); o registro só
existe para dar rótulo/ordem à UI.

## 4. O que o importador Nuvemshop popula hoje

| Campo do domínio | Origem real | Observação |
|---|---|---|
| `brandSlug` | Coluna `Marca` | `slugify(marca)` — funciona mesmo sem um `Brand` cadastrado ainda em `brands.ts` |
| `barcode` | Coluna `Código de barras` | |
| `tags` | Coluna `Tags` | Split por vírgula |
| `attributes.cor` | Variação nomeada "Cor", produto de cor única | |
| `variants[].attributes.cor` | Variação nomeada "Cor", produto com várias cores reais | Corrigido nesta sprint — antes o valor era perdido (nem produto, nem variante) |
| `linha`/`tecnica`/`efeito`/`curvatura`/`espessura`/`comprimento`/`material`/`volume` | — | **Sem coluna estruturada equivalente na Nuvemshop hoje** — deliberadamente não populados (nunca inferidos do nome do produto) |

## 5. O que a Tiny já teria, quando integrada

`gtin` (código de barras, campo real e documentado em
[API_TINY.md §4](../API_TINY.md)) → `barcode`. `brandSlug`/`attributes`/
`tags` não têm fonte confirmada na API da Tiny hoje — `tiny-mapper.ts`
documenta isso explicitamente em vez de inventar um mapeamento.

## 6. O que ainda não existe (arquitetura pronta, UI pendente)

- Rota de SEO pré-filtrada (`/cilios/maria-sasha`) — `resolveCatalogSlug`
  (`src/lib/facets/discover.ts`) já resolve o slug contra marca ou
  faceta; falta a página Next.js que a usa.
- Painel de filtros na Busca — o motor já suporta; falta a UI.
- Página de marca com banner — `Brand` já tem os campos
  (`description`, `bannerImage`, `seoTitle`, `seoDescription`); falta a
  página.
