# Feature: Home (Sprint 9 — Home Inteligente)

> Volta para [README.md](./README.md). Complementa
> [home-and-search.md](./home-and-search.md), que documenta a Busca e a
> Home original (Sprint 6); este documento cobre especificamente a
> decomposição em seções da Sprint 9.

## 1. O que é

A Home deixou de ser uma única tela monolítica (hero + grid) e passou a
ser composta por seções independentes — cada uma um componente próprio,
que decide sozinha se tem algo para mostrar. Nenhuma seção sabe da
existência das outras.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `HomeSection.tsx` | Wrapper único que decide **para toda seção**: título+CTA, skeleton de carregamento, "não renderiza nada" em erro ou vazio. Nenhuma seção reimplementa essa política. |
| `HomeSectionTitle.tsx` | Título + link "Ver tudo" opcional — usado por `HomeSection`. |
| `HomeCarousel.tsx` | Carrossel horizontal genérico (scroll + snap), usado por toda seção que mostra uma fileira de itens. |
| `HomeHero.tsx` | Banner principal — recebe `HeroBanner[]` (`src/types/index.ts`); com 1 banner é estático, com 2+ vira carrossel automático. |
| `HomeContinueShopping.tsx` | Produtos do carrinho + CTA "Ver carrinho". Não renderiza se o carrinho está vazio. |
| `HomeFavorites.tsx` | Produtos favoritados + CTA "Ver tudo". Não renderiza se não há favoritos. |
| `HomeBadgeSection.tsx` | Implementação compartilhada por `HomeBestSellers`/`HomeNewProducts` (mesma query, badge diferente) — evita duplicar a mesma lógica duas vezes. |
| `HomeBestSellers.tsx`, `HomeNewProducts.tsx` | Wrappers finos sobre `HomeBadgeSection`, filtrando por `badge: "mais-vendido"`/`"novo"`. |
| `HomeCategories.tsx` | Vitrine visual de categorias (ícone + nome), cada uma linkando para `/busca?categoria=...` — distinto do `CategoryPills` (filtro em página), que continua existindo. |

## 3. Contrato: por que `badge` no `ProductQuery` em vez de um mock à parte

"Mais Vendidos" e "Novidades" reaproveitam o campo `badge` que `Product`
já tinha desde a Sprint 1 (`"novo" | "mais-vendido" | "promocao"`) — a
Sprint 9 só ampliou `ProductQuery` (Sprint 6) com um filtro
`badge?: Product["badge"]`, aplicado em `applyProductQuery()`. Isso
significa que essas seções passam pelo **mesmo** caminho
`useProductQuery` → `/api/products` → `catalogService` →
`ProductRepository.query()` que toda outra tela já usa — funcionam hoje
com `MockProductRepository` e funcionarão com `TinyProductRepository`
sem nenhuma mudança aqui, satisfazendo a regra de "não acoplar aos
mocks".

## 4. Contrato: `HeroBanner`

```ts
type HeroBanner = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
  theme: "dark" | "light";
};
```

Hoje vive como array mock em `src/lib/data/banners.ts` (um único
banner, preservando o texto que a Home já tinha antes da Sprint 9).
`HomeHero` já sabe renderizar múltiplos banners como carrossel
auto-rotativo — accrescentar um segundo banner ali é a única mudança
necessária para testar isso. Preparado para uma futura administração
(ver [ADMIN_PANEL.md](../ADMIN_PANEL.md)) trocar esse array mock por uma
fonte editável, sem mudar `HomeHero`.

## 5. Estados: por que erro vira "não renderiza" e não uma mensagem

Todas as seções desta sprint são **secundárias/complementares** — nenhuma
delas bloqueia a compra. Se "Mais Vendidos" falhar ao carregar, mostrar
uma mensagem de erro ali chamaria atenção para um problema que não
compromete a experiência principal (a cliente ainda consegue buscar,
ver categorias, comprar). Por isso `HomeSection` trata `isError` como
"não renderiza nada", não como um estado visível — diferente do
`ProductGrid` (Sprint 6), que É a experiência principal e por isso
mostra erro com botão de tentar novamente. Ver
[SPRINT_9_REPORT.md](../SPRINT_9_REPORT.md) para a decisão completa.

## 6. Analytics e recomendações: arquitetura, não funcionalidade

- `src/lib/analytics.ts`: `trackEvent()` tipado
  (`banner_click`/`category_click`/`favorite_click`/`product_click`),
  sem nenhuma integração real — só `console.debug` em desenvolvimento.
  Conectado em `HomeHero`, `HomeCategories`, `FavoriteButton`, e
  `ProductCard` (via prop opcional `analyticsSource`).
- `src/services/recommendation-service.ts`: `RecommendationStrategy`
  (interface), `RecommendationContext` (tipo), `RecommendationProvider`
  (injeção de dependência, mesmo padrão de `CatalogService`) e uma
  `FeaturedFallbackStrategy` trivial e determinística (não é IA) —
  arquitetura pronta para a Lumi implementar a mesma interface no
  futuro. **Não há uma seção visível de recomendações nesta sprint** —
  isso foi deliberado, para não sobrepor visualmente com "Mais
  Vendidos"/"Novidades", que já usam a mesma fonte de dados (produtos
  com badge).

## 7. Performance

`HomeContinueShopping`, `HomeFavorites`, `HomeCategories`,
`HomeBestSellers`, `HomeNewProducts` são importados via `next/dynamic`
em `src/app/page.tsx` — code-split, carregados sob demanda, sem
bloquear o bundle inicial da Home (que fica focado em
Header/Busca/Hero/Grid). Como cada seção já sabe não renderizar nada
quando vazia, não há salto de layout enquanto esses chunks carregam.

## 8. O que essa feature não faz (ainda)

Seção de recomendações visível (arquitetura pronta, não conectada —
ver §6), administração real de banners (mock hoje), analytics real
(estrutura pronta, sem provedor conectado), qualquer lógica de IA (Lumi
ainda não existe).
