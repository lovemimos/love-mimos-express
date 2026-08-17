# Arquitetura do Catálogo — Documento Oficial

> Volta para [ARCHITECTURE.md](./ARCHITECTURE.md) · Ver também
> [PRODUCT_CATALOG_GUIDE.md](./PRODUCT_CATALOG_GUIDE.md) e
> [features/nuvemshop-import.md](./features/nuvemshop-import.md)

Este é o documento de referência para o domínio do catálogo — modelo,
camadas, e as decisões que tornam essa arquitetura independente de
qualquer fonte de dados específica (Nuvemshop hoje, Tiny ERP amanhã).

## 1. Diagrama do domínio

```
┌─────────────────────────────────────────────────────────────────┐
│ Product                                                          │
│  id, slug, name, shortDescription, description                  │
│  price, compareAtPrice, stock                                    │
│                                                                    │
│  sku, barcode, manufacturer      ── identidade/estoque, nunca     │
│                                     "navegável" (não é o tipo de  │
│                                     coisa que vira filtro)         │
│                                                                    │
│  categorySlug ───────────────────► Category (7 itens, menu fixo) │
│  brandSlug?   ───────────────────► Brand (entidade própria)       │
│                                                                    │
│  attributes?: Record<string,string> ─► FACET_REGISTRY (9 chaves: │
│                                          linha, técnica, efeito,   │
│                                          curvatura, espessura,     │
│                                          comprimento, cor,         │
│                                          material, volume)         │
│  tags?: string[]                  ── palavras-chave livres        │
│                                                                    │
│  images, badge, rating, reviewCount                               │
│  variants?: ProductVariant[]                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ProductVariant                                                    │
│  id, label, priceModifier?                                        │
│  attributes?: Record<string,string>  ── quando a própria variação │
│    (ex.: "Cor" com Preto/Azul/Verde   É uma faceta, o valor mora  │
│     em linhas reais distintas)         aqui, não no produto        │
│                                        (evita mentir sobre as       │
│                                         outras opções)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Category — { id, name, slug, icon }                                │
│  7 itens fixos, o menu principal. SEM subcategoria — essa           │
│  hierarquia não existe mais no domínio.                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Brand — { id, slug, name, description?, bannerImage?,              │
│           seoTitle?, seoDescription? }                              │
│  Entidade própria (não um atributo genérico) — preparada para       │
│  página de marca, banner, SEO próprio.                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ProductQuery (motor de busca/filtro — repositories/product-query) │
│  search, categorySlug, brandSlug, sort, page, pageSize             │
│  onlyAvailable, priceMin, priceMax, badge, featuredOnly             │
│  attributes?: Record<string,string[]>  ── considera produto E       │
│                                            variante (ver §4)         │
│  tags?: string[]                                                     │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Por que três tipos de dado diferentes, nunca misturados

| Categoria de dado | Onde mora | Por quê |
|---|---|---|
| Identidade/estoque | Campos de topo (`sku`, `barcode`, `manufacturer`) | Mapeiam 1:1 com a Tiny; ninguém filtra a vitrine por código de barras |
| Categoria principal | `categorySlug` → `Category` | Menu fixo, simples, 7 itens — a única hierarquia real que sobrevive |
| Marca | `brandSlug` → `Brand` | Precisa de página própria, banner, descrição, SEO — os outros atributos não |
| Facetas de navegação | `attributes` → `FACET_REGISTRY` | Linha, técnica, efeito, curvatura, espessura, comprimento, cor, material, volume — todas com a mesma natureza (filtro), tratadas de forma idêntica |
| Palavras-chave livres | `tags` | Não são "chave:valor" como uma faceta — forçá-las em `attributes` inventaria uma chave que não existe |

## 3. Por que Marca é uma entidade e as outras facetas não

Simetria com o motivo real: `Brand` carrega `description`, `bannerImage`,
`seoTitle`, `seoDescription` — dados que uma página de marca vai
precisar. Nenhuma das outras 9 facetas tem esse requisito hoje. Se
"Técnica" um dia precisar de página própria, o padrão para promovê-la a
entidade já está estabelecido (é exatamente o que aconteceu com Marca).

## 4. `ProductVariant.attributes` — por que existe

Um produto com 5 cores reais não cabe em `Product.attributes.cor`
(um único valor) sem mentir sobre as outras 4. Quando a variação **é**
a própria faceta, o valor vai para `variants[].attributes`, e o motor
de busca (`applyProductQuery`) considera **produto e variantes** ao
filtrar por qualquer faceta — `productHasAttributeValue()` em
`src/lib/repositories/product-query.ts`.

## 5. Camadas — de fora para dentro

```
Fontes externas (isoladas)          Domínio (não sabe da origem)        UI
─────────────────────────           ──────────────────────────         ──
src/lib/import/nuvemshop/    ──┐
  (parser, grouping, mapper,   │
   nuvemshop-category-mapping) │
                                ├──►  Product, Brand, ProductVariant,
src/lib/repositories/tiny/   ──┤     Category (src/types/index.ts)
  (tiny-mapper, tiny-client)   │            │
                                │            ▼
                                │     ProductQuery / applyProductQuery
                                │     (src/lib/repositories/product-query.ts)
                                │            │
                                │            ▼
                                │     FACET_REGISTRY, discoverFacetValues,
                                │     resolveCatalogSlug
                                │     (src/lib/facets/)
                                │            │
                                └────────────┴──►  catalogService → hooks → UI
```

**Regra de dependência**: as setas só apontam para dentro. `src/lib/facets/`,
`src/lib/repositories/product-query.ts` e `src/types/index.ts` nunca
importam nada de `src/lib/import/nuvemshop/` ou
`src/lib/repositories/tiny/` — é sempre o inverso.

## 6. Compatibilidade com múltiplas fontes — como isso é garantido

- `Product`/`Brand`/`ProductVariant`/`Category` (o domínio) não têm
  nenhum campo, comentário ou nome que mencione "Nuvemshop" ou "Tiny".
- Tudo que é específico da Nuvemshop (parsing de CSV, agrupamento por
  linha, tradução de categoria hierárquica, extração de marca/tags a
  partir de colunas) vive exclusivamente em `src/lib/import/nuvemshop/`.
- Tudo que é específico da Tiny (payload da API, paginação, retry,
  cache) vive exclusivamente em `src/lib/repositories/tiny/`.
- As duas fontes produzem exatamente o mesmo tipo `Product` — o resto
  do sistema (query engine, facetas, UI) não sabe, e não precisa saber,
  de onde um produto veio.
- Quando um campo do domínio (`barcode`, por exemplo) tem uma origem
  real e documentada em uma fonte mas não na outra, isso fica honesto:
  `tiny-mapper.ts` mapeia `gtin` → `barcode` (campo real, documentado em
  `API_TINY.md`); o mesmo arquivo comenta explicitamente que
  `brandSlug`/`attributes`/`tags` não têm fonte confirmada na Tiny hoje,
  em vez de inventar um mapeamento.

## 7. SOLID / Clean Architecture aplicados

- **Single Responsibility**: `FACET_REGISTRY` só declara metadado de
  faceta; `discoverFacetValues`/`resolveCatalogSlug` só descobrem e
  resolvem; `applyProductQuery` só filtra/ordena/pagina; cada camada de
  importação só traduz sua fonte. Nenhuma dessas responsabilidades se
  sobrepõe.
- **Open/Closed**: uma nova faceta é uma linha em `FACET_REGISTRY` —
  zero mudança em `Product`, na query engine, ou nos importadores. Uma
  nova fonte de dados (ex.: uma segunda planilha) é um novo módulo em
  `src/lib/import/`, sem tocar no domínio.
- **Liskov/Interface consistency**: `MockProductRepository` e
  `TinyProductRepository` implementam o mesmo `ProductRepository`,
  chamando o mesmo `applyProductQuery` — intercambiáveis por
  `DATA_SOURCE` sem a UI perceber diferença.
- **Interface Segregation**: `ProductQuery` expõe só os filtros que a UI
  realmente usa (busca, categoria, marca, facetas, tags, preço,
  disponibilidade) — nenhum campo interno de nenhuma fonte vaza para
  esse contrato.
- **Dependency Inversion**: o domínio (`types/index.ts`,
  `product-query.ts`, `facets/`) não depende de nenhuma camada de
  importação — são as camadas de importação que dependem do domínio
  (importam `Product`, nunca o contrário).
- **Clean Architecture**: entidades (`Product`, `Brand`,
  `ProductVariant`, `Category`) no centro, sem nenhuma dependência
  externa; regras de aplicação (`product-query.ts`, `facets/`) na
  camada seguinte, dependendo só das entidades; adaptadores de fonte de
  dados (`import/nuvemshop/`, `repositories/tiny/`) na borda,
  convertendo formato externo → entidade. Nenhuma seta de dependência
  aponta de dentro para fora.

## 8. O que essa arquitetura ainda não tem (deliberadamente, nesta etapa)

Por instrução explícita ("não implemente novas funcionalidades"), o
seguinte está **modelado e pronto para receber**, mas não construído
nesta sprint:

- Páginas de SEO pré-filtradas (`/cilios/maria-sasha`) — a resolução
  (`resolveCatalogSlug`) já existe; a rota Next.js ainda não.
- UI de filtros facetados na Busca — o motor de consulta já suporta;
  os componentes visuais ainda não.
- Página de marca com banner — o tipo `Brand` já tem os campos; a
  página ainda não existe.

## 9. Testes que garantem essa arquitetura

`src/lib/repositories/product-query.test.ts` (facetas produto+variante,
`brandSlug`, `tags`), `src/lib/import/nuvemshop/mapper.test.ts` (marca →
brandSlug, cor único vs. multi-variante, barcode, tags),
`src/lib/repositories/tiny/tiny-mapper.test.ts` (mapeamento honesto de
`gtin`).
