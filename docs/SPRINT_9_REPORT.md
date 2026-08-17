# Relatório da Sprint 9 — Home Inteligente

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [docs/features/home.md](./features/home.md)

## Resumo executivo

A Home foi decomposta de uma tela única (hero + grid) em seções
independentes, cada uma um componente próprio que decide sozinha se tem
algo para mostrar. Nenhuma IA foi implementada — o objetivo era
construir a infraestrutura visual e arquitetural que a Lumi (futura) vai
usar: seções condicionais, um contrato de banner preparado para
administração, "Mais Vendidos"/"Novidades" reaproveitando a arquitetura
de busca da Sprint 6 (sem acoplar a mocks), estrutura de analytics sem
integração, e uma arquitetura de recomendação (interfaces + estratégia
trivial não-IA) pronta para receber uma implementação real depois.

**Leitura prévia**: `PROJECT_VISION.md`, `ROADMAP.md`, `DESIGN_SYSTEM.md`,
`ARCHITECTURE.md`, `ENGINEERING_GUIDELINES.md`, `CHANGELOG.md` — lidos
antes de qualquer alteração. `CLAUDE.md` não existe no projeto.

## Componentes criados

`HomeSection`, `HomeSectionTitle`, `HomeCarousel`, `HomeHero`,
`HomeContinueShopping`, `HomeFavorites`, `HomeBadgeSection`,
`HomeBestSellers`, `HomeNewProducts`, `HomeCategories` — todos em
`src/features/home/components/`.

## Arquivos criados

Os 10 componentes acima + `src/lib/data/banners.ts`,
`src/lib/analytics.ts`, `src/services/recommendation-service.ts`,
`docs/features/home.md`, `docs/SPRINT_9_REPORT.md`, e 4 arquivos de
teste (`HomeSection.test.tsx`, `HomeHero.test.tsx`,
`recommendation-service.test.ts`).

## Arquivos alterados

`src/types/index.ts` (`HeroBanner`), `src/lib/repositories/product-query.ts`
(`badge`), `src/app/api/products/route.ts`, `src/hooks/useProducts.ts`,
`src/app/page.tsx` (recomposta), `ProductCard.tsx` (`analyticsSource`),
`FavoriteButton.tsx` (tracking), `vitest.config.ts` (suporte a `.tsx` e
JSX), `package.json` (novas dependências de teste), `docs/ARCHITECTURE.md`,
`docs/ROADMAP.md`, `docs/CHANGELOG.md`.

## Decisões arquiteturais

### 1. `HomeSection` centraliza a política de estados — nenhuma seção reimplementa

As 5 seções condicionais (Continue Comprando, Favoritos, Categorias,
Mais Vendidos, Novidades) passam por um único wrapper que decide
carregando/erro/vazio/renderização. Isso evita exatamente o tipo de
duplicação que `ENGINEERING_GUIDELINES.md` proíbe — sem essa
centralização, a regra "não renderiza se vazio" teria sido escrita 5
vezes.

### 2. Erro em seção secundária = não renderiza, não mensagem visível

Diferente do `ProductGrid` (a experiência principal, que mostra erro
com retry), as seções da Home são complementares — uma falha ali não
deveria assustar a cliente nem competir visualmente com a experiência
principal. Ver justificativa completa em
[docs/features/home.md §5](./features/home.md#5-estados-por-que-erro-vira-não-renderiza-e-não-uma-mensagem).

### 3. `HomeBestSellers`/`HomeNewProducts` reaproveitam `ProductQuery`, não um mock separado

O brief pedia "dados mock preparados para futura substituição pelo
Tiny... criar contrato específico... não acoplar aos mocks". Em vez de
inventar uma nova fonte de dados só para essas duas seções, estendemos o
contrato que já existe (`ProductQuery.badge`, sobre o campo `badge` que
`Product` já tinha desde a Sprint 1). Essas seções já funcionam com
`TinyProductRepository` hoje, sem qualquer adaptação futura.

### 4. Recomendações: arquitetura sem seção visível

`RecommendationProvider`/`RecommendationStrategy` foram criados e
testados, mas **não conectados a nenhuma seção na tela**. Uma
`FeaturedFallbackStrategy` determinística usando o mesmo campo `badge`
produziria uma seção quase idêntica a "Mais Vendidos"/"Novidades" —
conectá-la visualmente agora seria redundância de conteúdo, não de
código. A arquitetura está pronta; a decisão de exibi-la fica para
quando houver uma estratégia real (Lumi) que produza algo
genuinamente diferente.

### 5. `next/dynamic` para as 5 seções secundárias

Hero, busca e grid ficam no bundle inicial da Home; as seções
condicionais são code-split, carregadas sob demanda. Como cada uma já
sabe não renderizar nada quando vazia, não há salto de layout enquanto
esses chunks carregam.

## Testes

| Suite | Cobre |
|---|---|
| `HomeSection.test.tsx` (6) | Renderização normal, não-renderização em erro, não-renderização em vazio (regra central), skeleton durante carregamento mesmo com vazio, CTA presente/ausente |
| `HomeHero.test.tsx` (6) | Banner único, lista vazia não renderiza, sem dots com 1 banner, dots com múltiplos banners, temas dark/light |
| `recommendation-service.test.ts` (6) | Estratégia trivial filtra por badge, exclui favoritos/carrinho, catálogo vazio, `RecommendationProvider` delega corretamente, aceita qualquer implementação do contrato |
| `product-query.test.ts` (+1) | Filtro por badge específico distingue Mais Vendidos de Novidades |

**Resultado**: `npm run test` → **150/150** (19 novos).

## Build e lint

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros |
| `npm run test` | ✅ 150/150 |
| `npm run build` | ✅ compila, 23 rotas |

Confirmado manualmente (servidor real): `HomeContinueShopping`/
`HomeFavorites` não aparecem no HTML da Home quando carrinho/favoritos
estão vazios (sessão nova); `/api/products?badge=mais-vendido` e
`?badge=novo` retornam conjuntos corretos e distintos de produtos.

## Riscos encontrados

- **Primeira vez testando componentes React de verdade** (não só lógica
  pura) — adicionamos `jsdom` + `@testing-library/react` e configuramos
  `esbuild.jsx: "automatic"` no Vitest. Baixo risco (isolado em arquivos
  `.test.tsx`, testes de lógica pura continuam no ambiente `node`
  padrão), mas é uma superfície nova no projeto.
- **Carrossel sem gesto de arraste testado em dispositivo real** — usa
  scroll nativo (`overflow-x-auto`), que funciona bem em touch, mas não
  foi validado em hardware físico, só no navegador do ambiente de
  desenvolvimento.
- **`HomeHero` com rotação automática (múltiplos banners)** — hoje só
  existe 1 banner mock, então o carrossel automático nunca roda em
  produção ainda; a lógica está testada unitariamente (dots aparecem
  com 3 banners), mas não observada rodando "ao vivo" por 6+ segundos.

## Melhorias sugeridas para a próxima sprint

1. Se/quando a Lumi existir, ela implementa `RecommendationStrategy` e
   uma `HomeRecommendations.tsx` usa `recommendationProvider` — nenhuma
   outra mudança arquitetural necessária.
2. Conectar analytics real (ex.: Vercel Analytics, Plausible) trocando
   só o corpo de `trackEvent()` em `src/lib/analytics.ts`.
3. Quando existir um painel administrativo (ver `ADMIN_PANEL.md`),
   banners passam a vir de lá em vez de `src/lib/data/banners.ts` — sem
   mudar `HomeHero`.
4. Validar o carrossel de banners com 2+ banners reais e em dispositivo
   físico antes de confiar nele em produção.
