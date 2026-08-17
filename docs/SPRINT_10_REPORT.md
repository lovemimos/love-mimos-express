# Relatório da Sprint 10 — Recommendation Engine

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [docs/features/recommendations.md](./features/recommendations.md)

## Resumo executivo

Construímos um motor de recomendações totalmente desacoplado e baseado
em regras — **nenhuma IA**. A arquitetura nasceu na Sprint 9 (só
interface, sem consumidor); esta sprint implementou 6 estratégias
concretas, um `RecommendationEngine` (executa qualquer estratégia por
nome) separado de um `RecommendationProvider` (seleciona automaticamente
qual usar por prioridade), e conectou tudo em Home, Produto e Carrinho
através de um único componente reutilizável. Carrinho e Favoritos não
foram alterados — recomendações só leem esses stores pelo seletor
público que já existia.

**Leitura prévia**: `PROJECT_VISION.md`, `ROADMAP.md`, `DESIGN_SYSTEM.md`,
`ARCHITECTURE.md`, `ENGINEERING_GUIDELINES.md`, `CHANGELOG.md` — lidos
antes de qualquer alteração. `CLAUDE.md` não existe no projeto.

## Arquitetura criada

```
RecommendationEngine  (registro de estratégias, executa por nome)
        ^ usado por
RecommendationProvider  (escolhe automaticamente por prioridade)
        ^ usado por
RecommendationSection  (componente único: Home / Produto / Carrinho)
        ^ usa
RecommendationCarousel  (reaproveita HomeCarousel + ProductCard)
```

`useRecommendationContext` monta o contexto (favoritos/carrinho/produto
atual) lendo `useCartStore`/`useFavoritesStore` só pelos seletores
públicos já existentes — nunca importa `cart-service.ts`/
`favorites-service.ts`. `useFullCatalog` busca o catálogo via
`useProductQuery` (o mesmo hook de sempre, compatível com Mock e Tiny).

## Estratégias implementadas

| Estratégia | Sinal usado |
|---|---|
| `RelatedProductsStrategy` | Categoria do produto visto (sem marca/tags — campos ainda não existem no modelo) |
| `CompleteKitStrategy` | Tabela mock de categorias complementares (`kit-pairings.ts`) |
| `BestSellerStrategy` | Badge `"mais-vendido"` |
| `NewestProductsStrategy` | Badge `"novo"` (upgrade natural para `dataCriacao` da Tiny depois) |
| `FavoriteBasedStrategy` | Categorias dos produtos favoritados |
| `CartBasedStrategy` | Categorias complementares aos itens do carrinho, com fallback para mesma categoria |

## Componentes criados

`RecommendationSection` (usado 3x, props diferentes), `RecommendationCarousel`
(reaproveita `HomeCarousel`/`ProductCard`, nenhum novo). Hooks:
`useRecommendationContext`, `useFullCatalog`, `useRecommendations`.

## Decisões técnicas

1. **Engine ≠ Provider**: o motor executa, o provider escolhe. Adicionar
   uma 7ª estratégia (Lumi real) nunca toca a seleção; mudar a
   prioridade de uma tela nunca toca as estratégias.
2. **`isApplicable()` novo no contrato**: permite ao provider descartar
   estratégias sem sinal suficiente sem executá-las e checar o
   resultado depois — mais barato e mais claro.
3. **Recomendações leem Carrinho/Favoritos só por seletor público**:
   `useCartStore((s) => s.lines)`/`useFavoritesStore((s) => s.entries)`
   — os mesmos que qualquer outro consumidor já usa. Nenhum arquivo de
   Carrinho/Favoritos foi tocado.
4. **Integração nas 3 telas foi puramente aditiva**: uma importação + uma
   linha de JSX em cada uma, sem tocar em nenhuma lógica de negócio
   existente (confirmado revisando cada diff).
5. **`recommendation_add_to_cart`/`recommendation_favorite` definidos,
   nunca disparados**: dispará-los exigiria uma ação de "adicionar ao
   carrinho"/"favoritar" diretamente no card de recomendação, o que
   tocaria em Carrinho/Favoritos — fora de escopo por regra explícita.
6. **`src/services/recommendation-service.ts` (Sprint 9) removido**,
   não deprecated — confirmado por busca que nada o importava, então
   não havia motivo para manter dois caminhos.

## Testes

| Suite | Cobre |
|---|---|
| `strategies.test.ts` (23) | Todas as 6 estratégias: `isApplicable`, lógica de recomendação, exclusões, casos de borda (limite, sem par complementar) |
| `recommendation-engine.test.ts` (6) | Registro no construtor, `register()` posterior, `get()`/`list()`, `run()` com nome válido/inválido, respeito ao limite |
| `recommendation-provider.test.ts` (5) | Seleção da primeira aplicável, pular aplicável-mas-vazia, `strategyName: "none"` quando nada se aplica, ignorar nome não registrado, respeito ao limite |
| `RecommendationSection.test.tsx` (4) | Não renderiza vazio, renderiza título+produtos, dispara `recommendation_view` com resultado, não dispara sem resultado |

**Resultado**: `npm run test` → **178/178** (28 novos).

## Build e lint

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros |
| `npm run test` | ✅ 178/178 |
| `npm run build` | ✅ compila, 23 rotas |

Confirmado manualmente (servidor real): `/produto/cilios-volume-russo-0-07`
mostra "Você também pode gostar"; Home, Carrinho, Produto respondem 200
sem erro no log do servidor.

## Riscos encontrados

- **`kit-pairings.ts` é uma tabela mock de merchandising**, não dados
  reais de "comprados juntos" — só um humano curou essas 6 relações de
  categoria. Dados reais exigiriam histórico de pedidos da Tiny, que
  não temos.
- **`RelatedProductsStrategy` só usa categoria** — sem marca/tags (não
  existem no modelo `Product` hoje), a estratégia é mais rasa do que o
  nome sugere. Documentado explicitamente, não escondido.
- **Duas estratégias fallback-safe (`BestSeller`/`Newest`) sempre
  aplicáveis** — se um catálogo real não tiver nenhum produto com badge,
  o provider chega ao fim da lista de prioridade sem nada, retornando
  `"none"` — comportamento testado e correto, mas vale lembrar ao
  configurar um catálogo Tiny real sem esses badges equivalentes.

## Próximos passos sugeridos

1. Quando `Product` ganhar marca/tags reais, `RelatedProductsStrategy`
   ganha esses sinais com uma mudança pequena e isolada.
2. Se histórico de pedidos da Tiny ficar disponível,
   `CompleteKitStrategy`/`CartBasedStrategy` trocam `kit-pairings.ts`
   por dados reais sem mudar o contrato `RecommendationStrategy`.
3. Quando a Lumi existir, ela implementa `RecommendationStrategy`
   diretamente e entra na lista de prioridade de qualquer provider —
   nenhuma mudança arquitetural adicional.
4. `recommendation_add_to_cart`/`recommendation_favorite` ficam prontos
   para o dia em que um card de recomendação ganhar ação direta — nesse
   momento, essa mudança toca Carrinho/Favoritos conscientemente, fora
   desta sprint.
