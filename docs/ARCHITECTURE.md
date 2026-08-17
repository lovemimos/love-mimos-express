# Arquitetura — Camada de Dados

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md). Este documento
> descreve a arquitetura de dados: repositórios, serviços e o modelo de
> carrinho introduzidos na Sprint 3, e a integração real com a Tiny ERP
> implementada na Sprint 4 (ver
> [SPRINT_4_REPORT.md](./SPRINT_4_REPORT.md)). `DATA_SOURCE=mock`
> continua sendo o padrão — a Tiny é opt-in via variável de ambiente.
>
> **Modelo de domínio do catálogo** (Product, Brand, ProductVariant,
> Category, facetas): ver o documento oficial dedicado,
> [ARCHITECTURE_CATALOG.md](./ARCHITECTURE_CATALOG.md).

## 1. Por que isso mudou

Até a Sprint 2, hooks e páginas importavam `products`/`categories`
diretamente de `src/lib/data/*.ts` — funcional, mas cada consumidor
dependia diretamente do formato e da localização do catálogo mock. Trocar
por uma fonte real (Tiny) exigiria caçar e editar cada import.

A partir de agora, **nenhum hook, página ou componente importa
`lib/data/products.ts` ou `lib/data/categories.ts` diretamente** (com uma
única exceção documentada em §5). Tudo passa por uma cadeia fixa de
camadas, e só uma delas conhece o mock:

```
UI (hooks / Server Components)
        ↓ depende de
Service            (src/services/catalog-service.ts)
        ↓ depende de
Repository interface (src/lib/repositories/contracts.ts)
        ↑ implementado por
Mock Repository    (src/lib/repositories/mock/*.ts) — único lugar que
                     conhece src/lib/data/*.ts
```

## 2. As camadas, uma por uma

### Contratos — `src/lib/repositories/contracts.ts`

Duas interfaces, `ProductRepository` e `CategoryRepository`, definem os
únicos métodos que qualquer fonte de dados precisa oferecer
(`findAll`, `findBySlug`, `findByCategory`, `search`). Todos os métodos
são `async` **de propósito**, mesmo o mock sendo instantâneo — isso é o
que torna a interface honesta sobre como uma implementação real de rede
vai se comportar. Nenhum código fora deste arquivo deveria importar uma
implementação concreta (`MockProductRepository`) diretamente — sempre o
tipo `ProductRepository`/`CategoryRepository`.

### Implementação mock — `src/lib/repositories/mock/`

`MockProductRepository` e `MockCategoryRepository` implementam essas
interfaces lendo de `src/lib/data/products.ts`/`categories.ts` (os mesmos
arrays estáticos de sempre — nada nos dados mudou). Este é o **único**
lugar do código (fora da exceção em §5) que importa esses arquivos.

### Composition root — `src/lib/repositories/index.ts`

Escolhe a implementação ativa com base em `DATA_SOURCE`
(`.env`/`.env.example`):

```ts
export const productRepository: ProductRepository =
  activeSource === "tiny" ? new TinyProductRepository() : new MockProductRepository();
```

Se `DATA_SOURCE=tiny` mas as credenciais não estiverem completas, este
arquivo já cai para o mock na inicialização (com aviso no log) — nunca
tenta instanciar um cliente Tiny sem credenciais. Ver
[API_TINY.md](./API_TINY.md) para o funcionamento completo da
implementação Tiny (`src/lib/repositories/tiny/`).

### Serviço — `src/services/catalog-service.ts`

`CatalogService` recebe os repositórios via construtor (injeção de
dependência simples, sem framework) e expõe as operações que a aplicação
realmente usa: `listProducts`, `getProduct`, `listProductsByCategory`,
`searchProducts`, `listCategories`. Hoje é um passa-adiante fino — a
Sprint 4 é o lugar certo para regras de negócio que não são
responsabilidade da fonte de dados (ex.: esconder produto sem estoque,
combinar filtro de categoria + busca), sem empurrar essa lógica para
dentro de hooks ou componentes.

### Modelo de Carrinho — `src/services/cart-service.ts`

O carrinho ganhou seu próprio módulo de lógica de domínio, **puro e sem
dependência de Zustand ou de React**:

- `resolveCartLines(lines, products)` — resolve `CartLine[]` (só IDs)
  contra um catálogo em `CartLineWithProduct[]` (produto/variante/preço
  já resolvidos).
- `computeCartTotals(lines)` — deriva subtotal e contagem de itens.
- `buildCart(lines, products)` — os dois juntos, devolvendo o tipo
  agregado `Cart` (novo, em `src/types/index.ts`).

`useCartStore` (Zustand) continua responsável só por **persistir**
`CartLine[]` em localStorage — ele nunca soube o preço de nada, e
continua não sabendo. `useCartLines` (o hook que os componentes usam) é
hoje só uma composição: lê linhas do store, lê produtos via
`useProductQuery()`, e chama `buildCart` — nenhuma lógica própria.

**Reforço de infraestrutura (Sprint 7)**: `useCartStore` ganhou
`hasItem(productId, variantId?)` (consulta de existência) e um `storage`
customizado para o `persist` — o padrão do Zustand não captura erros de
`JSON.parse`, então dados corrompidos em `localStorage` derrubavam a
inicialização do store com uma exceção não tratada. Isso foi corrigido
(logs um aviso, limpa a chave corrompida, devolve carrinho vazio) e
testado explicitamente — ver
[docs/features/cart.md §4](./features/cart.md#4-decisões-e-por-quê) e
[SPRINT_7_REPORT.md](./SPRINT_7_REPORT.md). Estado morto nunca consumido
(`isOpen`/`openCart`/`closeCart`, resquício de sprints anteriores) foi
removido do store nessa mesma revisão.

## 3. Tipos de domínio — `src/types/index.ts`

Nenhum tipo existente mudou de formato (`Product`, `Category`, `CartLine`,
`CartLineWithProduct` continuam exatamente iguais — a UI não percebe
diferença). Um tipo novo foi adicionado:

```ts
export type Cart = {
  lines: CartLineWithProduct[];
  subtotal: number;
  itemCount: number;
};
```

Antes esse formato existia só implicitamente (o retorno de
`useCartLines`); agora tem nome e é o tipo que `cart-service.ts` produz.

## 4. O que a UI passou a consumir

| Antes (Sprint 2) | Agora (Sprint 3) |
|---|---|
| `import { products } from "@/lib/data/products"` | `useProducts()` → `catalogService.listProducts()` |
| `import { categories } from "@/lib/data/categories"` | `useCategories()` (novo hook) → `catalogService.listCategories()` |
| `getProductBySlug` importado direto na página de produto (Server Component) | `catalogService.getProduct(slug)` |
| Lógica de resolução do carrinho inline em `useCartLines` | `buildCart` em `cart-service.ts` |

Visualmente **nada mudou** — mesmo HTML, mesmo CSS, mesmo comportamento.
Only a camada por baixo dos hooks foi reestruturada.

## 5. Exceção documentada: `initialData` em `src/hooks/useProducts.ts`

Os hooks de catálogo usam `initialData` do React Query para evitar
"flash" de carregamento — a mesma sensação instantânea que a Sprint 2 já
tinha. Isso exige um valor síncrono no primeiro render, então esse bloco
específico importa `products`/`categories` diretamente do mock, **em vez
de** esperar a resposta do Route Handler (que é sempre assíncrona,
inclusive com `DATA_SOURCE=tiny`).

Isso continua sendo aceitável mesmo com a Tiny em produção, porque
`initialData` aqui é só um placeholder para a primeira pintura da tela —
o `fetch("/api/products")` real acontece de qualquer forma e substitui
esse valor assim que responde. Se a resposta da Tiny demorar
perceptivelmente, a tela mostra o catálogo mock por um instante antes de
trocar pelo catálogo real — comportamento aceitável para esta sprint, mas
candidato a virar um estado de carregamento explícito (skeleton) se a
latência real da Tiny se mostrar incômoda em uso.

## 6. O que NÃO mudou na Sprint 3

- Nenhuma tela nova.
- Nenhuma mudança de fluxo de compra.
- Nenhuma mudança no Design System ou em qualquer componente visual.
- Nenhuma integração com a Tiny foi feita na Sprint 3 — isso ficou para a
  Sprint 4 (§7 e §8 abaixo).
- Catálogo mock continua com os mesmos 12 produtos, 6 categorias, mesmos
  preços/estoques.

## 7. Fronteira cliente/servidor (Sprint 4): Route Handlers

Quando a Tiny virou uma implementação real (não mais hipotética), um
problema de arquitetura ficou visível: `src/hooks/useProducts.ts` é
consumido por **Client Components** (`HomePage`, `SearchPage` — ambos
`"use client"`), e até então esse hook chamava `catalogService`
diretamente. Isso funcionava com o mock (dados estáticos, sem segredo
nenhum), mas seria uma falha grave com a Tiny: código que sabe autenticar
com `client_secret`/`refresh_token` acabaria alcançável a partir do
navegador.

**Correção**: dois Route Handlers do Next.js —
`src/app/api/products/route.ts` e `src/app/api/categories/route.ts` — que
rodam **sempre no servidor**, mesmo sendo chamados via `fetch()` a partir
de um Client Component. `useProducts`/`useProductSearch`/`useCategories`
(consolidados em `useProductQuery`/`useCategories` na Sprint 6 — ver
[docs/features/home-and-search.md](./features/home-and-search.md))
agora fazem `fetch("/api/products"/...)` em vez de importar
`catalogService`.

```
Client Component (Home/Busca)
        ↓ fetch("/api/products")
Route Handler (src/app/api/products/route.ts) — roda só no servidor
        ↓ chama
CatalogService → Repository → (Mock | Tiny)
```

Server Components (ex.: `src/app/produto/[slug]/page.tsx`) continuam
chamando `catalogService` diretamente — não precisam de Route Handler
porque já rodam no servidor por definição.

**Reforço em build-time**: `catalog-service.ts`,
`src/lib/repositories/index.ts` e tudo em `src/lib/repositories/tiny/`
importam o pacote [`server-only`](https://www.npmjs.com/package/server-only)
— se qualquer Client Component voltar a importar esse código, mesmo que
transitivamente, o **build falha imediatamente**, em vez de vazar
credenciais silenciosamente para o bundle do navegador.

## 8. Favoritos (Sprint 8) e storage compartilhado

`useFavoritesStore` (`src/features/favorites/store/favorites-store.ts`)
segue exatamente o mesmo desenho do `useCartStore`: Zustand global (sem
Provider), persistido em `localStorage`, com lógica de negócio pura
separada em `src/services/favorites-service.ts` (mesmo papel que
`cart-service.ts` tem para o carrinho).

**Extração de `createSafeLocalStorage`**: o carrinho (Sprint 7) havia
corrigido um bug real do `persist` do Zustand (não captura JSON
corrompido). Ao construir o store de favoritos, essa lógica foi extraída
para `src/lib/persist/safe-local-storage.ts` — uma fábrica genérica
`createSafeLocalStorage<T>(label)` — em vez de duplicá-la pela segunda
vez. `cart-store.ts` foi atualizado para usar essa mesma fábrica. Ver
[docs/features/favorites.md](./features/favorites.md) e
[docs/features/cart.md](./features/cart.md).

## 9. Home decomposta em seções (Sprint 9)

A Home passou de uma tela única para uma composição de seções
independentes (`src/features/home/components/`) — cada uma decide
sozinha se renderiza algo, via um wrapper compartilhado
(`HomeSection.tsx`) que centraliza a política de
carregando/erro/vazio/não-renderização. Duas ampliações de contrato
suportam isso sem acoplar a mocks: `ProductQuery.badge` (filtro por
badge específico, para "Mais Vendidos"/"Novidades") e o novo tipo
`HeroBanner` (banner principal, hoje mock, preparado para administração
futura). Arquitetura de recomendação (`RecommendationStrategy`/
`RecommendationProvider`, mesmo padrão de injeção de dependência do
`CatalogService`) e analytics (`trackEvent()`) foram introduzidas como
pontos de extensão, sem nenhuma implementação de IA ou integração real.
Ver [docs/features/home.md](./features/home.md) e
[SPRINT_9_REPORT.md](./SPRINT_9_REPORT.md).

## 10. Motor de recomendações (Sprint 10)

A arquitetura de recomendação criada só como interface na Sprint 9
ganhou implementação real: `RecommendationEngine` (registro de
estratégias, executa por nome) + `RecommendationProvider` (seleciona
automaticamente a primeira estratégia aplicável de uma lista de
prioridade) + 6 `RecommendationStrategy` concretas, todas baseadas em
regras determinísticas — nenhuma IA. Uma única composição
(`src/services/recommendations/index.ts`) registra tudo uma vez e expõe
3 providers pré-configurados (Home/Produto/Carrinho), cada um só com uma
ordem de prioridade diferente. Um único componente
(`RecommendationSection`) é reaproveitado nas 3 telas, reaproveitando
por sua vez `HomeSection`/`HomeCarousel`/`ProductCard` já existentes —
nenhum carrossel ou card novo. Ver
[docs/features/recommendations.md](./features/recommendations.md) e
[SPRINT_10_REPORT.md](./SPRINT_10_REPORT.md).

## 11. Integração real com a Tiny (Sprint 4)

`TinyProductRepository`/`TinyCategoryRepository`
(`src/lib/repositories/tiny/`) implementam as mesmas interfaces do mock,
contra a API real da Tiny — autenticação OAuth2, paginação, cache,
timeout e fallback controlado para o mock em caso de falha. Documentação
técnica completa (endpoints, mapeamento de campos, riscos) em
[API_TINY.md](./API_TINY.md); resultado da sprint (testes, build, o que
foi validado) em [SPRINT_4_REPORT.md](./SPRINT_4_REPORT.md).

## 12. Catálogo facetado — domínio consolidado (Sprint de Arquitetura do Catálogo)

O modelo de Categoria → Subcategoria foi substituído por Categoria
Principal (7 itens fixos) + `Brand` (entidade própria, preparada para
página/banner/SEO) + facetas abertas (`Product.attributes`,
`ProductVariant.attributes`, registradas em `src/lib/facets/registry.ts`).
Toda regra específica de uma fonte de dados (Nuvemshop, Tiny) fica
isolada na respectiva camada de importação — o domínio
(`src/types/index.ts`, `src/lib/repositories/product-query.ts`,
`src/lib/facets/`) não conhece nenhuma delas. Documento oficial completo
(diagrama, decisões, SOLID/Clean Architecture) em
[ARCHITECTURE_CATALOG.md](./ARCHITECTURE_CATALOG.md); guia prático de
uso em [docs/features/faceted-catalog.md](./features/faceted-catalog.md).
