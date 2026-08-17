# Feature: Recommendations (Sprint 10 — Recommendation Engine)

> Volta para [README.md](./README.md)

## 1. O que é

Um motor de recomendações baseado em regras (nunca IA), desacoplado o
suficiente para uma futura estratégia da Lumi substituir qualquer peça
sem exigir mudança em nenhum outro arquivo. Nasceu na Sprint 9 (só a
arquitetura, sem estratégias reais) e ganhou 6 estratégias concretas,
um motor de execução e seleção automática nesta sprint.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/services/recommendations/types.ts` | `RecommendationContext`, `RecommendationStrategy` (contrato), `RecommendationResult`. |
| `src/services/recommendations/strategies/*.ts` | As 6 estratégias — ver §3. |
| `src/services/recommendations/recommendation-engine.ts` | `RecommendationEngine` — registro de estratégias, executa qualquer uma pelo nome. Não decide qual usar. |
| `src/services/recommendations/recommendation-provider.ts` | `RecommendationProvider` — decide automaticamente qual estratégia usar, tentando uma lista de prioridade em ordem até achar uma aplicável com resultado. |
| `src/services/recommendations/index.ts` | Composition root: 1 engine com as 6 estratégias registradas + 3 providers (Home/Produto/Carrinho), cada um com sua própria ordem de prioridade. |
| `src/lib/data/kit-pairings.ts` | Tabela mock de categorias complementares (ver §3, `CompleteKitStrategy`/`CartBasedStrategy`). |
| `src/features/recommendations/hooks/` | `useRecommendationContext` (lê carrinho/favoritos só por seletor público, nunca importa suas store/service), `useFullCatalog`, `useRecommendations`. |
| `src/features/recommendations/components/RecommendationSection.tsx` | O único componente usado em Home, Produto e Carrinho. |
| `src/features/recommendations/components/RecommendationCarousel.tsx` | Reaproveita `HomeCarousel` + `ProductCard` — nenhum carrossel/card novo. |

## 3. As 6 estratégias

| Estratégia | `isApplicable` | Lógica |
|---|---|---|
| `RelatedProductsStrategy` | há `currentProduct` | Mesma categoria do produto visto, excluindo ele mesmo. **Sem marca/tags** — `Product` não tem esses campos ainda (mesma limitação já documentada para a busca, [product.md §4](./product.md#4-decisões-e-por-quê)). |
| `CompleteKitStrategy` | categoria do produto tem par em `kit-pairings.ts` | Categorias complementares (ex.: cílios → cola). **Mock de merchandising**, não dados reais de "comprados juntos" — isso exigiria histórico de pedidos da Tiny, que não temos. |
| `BestSellerStrategy` | sempre (fallback seguro) | Badge `"mais-vendido"`. Já compatível com Tiny — o catálogo já vem de qualquer repositório ativo. |
| `NewestProductsStrategy` | sempre (fallback seguro) | Badge `"novo"`. Tiny expõe `dataCriacao` no payload do produto ([API_TINY.md §5](./API_TINY.md#5-mapeamento-de-campos-tiny--modelos-internos)) — trocar o filtro de badge por ordenação por data é upgrade direto, sem mudar o contrato. |
| `FavoriteBasedStrategy` | há ≥1 favorito | Categorias dos produtos favoritados, excluindo o que já é favorito/carrinho. |
| `CartBasedStrategy` | há ≥1 item no carrinho | Prioriza categorias complementares (`kit-pairings.ts`); cai para mesma categoria se não houver par definido. |

## 4. Motor vs. Provider: por que duas classes

`RecommendationEngine` só sabe **executar** uma estratégia pelo nome —
não tem opinião sobre qual usar. `RecommendationProvider` só sabe
**escolher** — recebe uma lista de prioridade e tenta cada uma até achar
uma aplicável com resultado. Essa separação significa: adicionar uma 7ª
estratégia (uma Lumi real) nunca toca a lógica de seleção; mudar a
prioridade de uma tela nunca toca as estratégias.

## 5. Três providers, três prioridades — sem duplicar a seleção

```ts
homeRecommendationProvider    → ["favorite-based", "cart-based", "best-seller", "newest-products"]
productRecommendationProvider → ["complete-kit", "related-products", "best-seller"]
cartRecommendationProvider    → ["cart-based", "complete-kit", "best-seller"]
```

A Home prioriza sinais pessoais (favoritos, depois carrinho) antes de
cair para vitrine genérica. A página de Produto prioriza o que combina
com o item visto. O Carrinho prioriza o que completa a compra atual. A
mesma classe `RecommendationProvider` resolve as três — só a ordem
muda.

## 6. `RecommendationSection`: um componente, três telas, zero duplicação

```tsx
<RecommendationSection provider={homeRecommendationProvider} title="Recomendado para Você" source="home" />
<RecommendationSection provider={productRecommendationProvider} title="Você também pode gostar" source="product" currentProduct={product} />
<RecommendationSection provider={cartRecommendationProvider} title="Complete seu Pedido" source="cart" />
```

Reaproveita `HomeSection` (Sprint 9) para a política de vazio/erro —
nenhuma recomendação nunca mostra uma seção quebrada; simplesmente não
aparece.

## 7. Por que carrinho/favoritos nunca foram alterados

`useRecommendationContext` lê `useCartStore((s) => s.lines)` e
`useFavoritesStore((s) => s.entries)` — os mesmos seletores públicos que
qualquer outro consumidor já usa. Nenhuma estratégia importa
`cart-service.ts`/`favorites-service.ts`, e nenhum arquivo de Carrinho ou
Favoritos foi tocado. A integração nas telas de Carrinho/Produto foi
puramente aditiva (uma importação + uma linha de JSX), sem tocar em
nenhuma lógica de negócio existente.

## 8. Eventos de analytics (estrutura, não integração)

`recommendation_view` e `recommendation_click` disparam de verdade
(`RecommendationSection`/`RecommendationCarousel`). `recommendation_add_to_cart`
e `recommendation_favorite` existem só como tipo em
`src/lib/analytics.ts` — dispará-los exigiria uma ação de "adicionar ao
carrinho"/"favoritar" diretamente no card de recomendação, o que
tocaria em Carrinho/Favoritos — fora de escopo por regra explícita desta
sprint.

## 9. O que essa feature não faz (ainda)

Qualquer recomendação baseada em aprendizado/IA (Lumi), recomendações
personalizadas por histórico de navegação além do que já está em
carrinho/favoritos, e os dois eventos de analytics não disparados (ver
§8).
