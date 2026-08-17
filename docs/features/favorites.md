# Feature: Favorites

> Volta para [README.md](./README.md)

## 1. O que é

Uma lista pessoal de produtos que a cliente quer guardar para depois —
sem login, sem conta, persistida localmente. Mesma filosofia do
[carrinho](./cart.md): infraestrutura simples, mas preparada para
crescer (sincronização com login, Tiny, Lumi, campanhas).

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `store/favorites-store.ts` | Fonte da verdade: array de `FavoriteEntry` (`productId` + `addedAt`) em Zustand, persistido via o mesmo `createSafeLocalStorage` que o carrinho usa. Expõe `add`, `remove`, `toggle`, `clear`, `isFavorite`. |
| `services/favorites-service.ts` | `resolveFavoriteProducts(entries, products)` — resolve IDs contra o catálogo, mais recente primeiro, descartando produtos que não existem mais. |
| `hooks/useFavoriteProducts.ts` | Composição: lê o store + `useProductQuery`, delega a resolução ao serviço — mesmo papel que `useCartLines` tem para o carrinho. |
| `components/FavoriteButton.tsx` | Botão de coração reutilizável — usado no `ProductCard`, no `ProductDetail`, e em qualquer lugar futuro que precise favoritar. |

## 3. Por que isso espelha o carrinho (Sprint 8)

Esta sprint reutilizou deliberadamente o desenho do `useCartStore`
(Sprint 0-7) em vez de inventar um padrão novo:

- **Zustand global, sem Provider** — mesma razão de
  [PROJECT_VISION.md §5](../PROJECT_VISION.md#5-decisões-técnicas-e-por-quê):
  um Context por cima seria boilerplate duplicado.
- **`createSafeLocalStorage` compartilhado**
  (`src/lib/persist/safe-local-storage.ts`) — extraído do `cart-store.ts`
  nesta mesma sprint para que carrinho e favoritos (e qualquer store
  futuro) tenham exatamente a mesma recuperação de dados corrompidos, em
  vez de duplicar essa lógica pela segunda vez.
- **Serviço puro separado do store** — mesma razão de
  [cart-service.ts](../ARCHITECTURE.md).

## 4. Diferença deliberada: sem variação

`FavoriteEntry` não tem `variantId` — favoritar é "eu gosto deste
produto", não "eu quero esta curvatura específica agora" (diferente do
carrinho, onde a variação afeta o preço). Um único produto nunca aparece
duas vezes na lista de favoritos, mesmo que tenha múltiplas variações.

## 5. `addedAt`: pensado para o futuro, não usado hoje na UI

Cada entrada guarda quando foi favoritada. Hoje isso só ordena "Meus
Favoritos" do mais recente para o mais antigo — mas existe justamente
para permitir, sem mudança de schema: campanhas baseadas em recência
("favoritou há 7 dias e não comprou"), e recomendações que considerem
"o que a cliente favoritou recentemente".

## 6. Casos de borda tratados

- Sem favoritos → `/favoritos` mostra estado vazio com CTA para o
  catálogo, não uma lista em branco.
- Produto favoritado que saiu do catálogo → descartado silenciosamente
  por `resolveFavoriteProducts`, mesma filosofia do carrinho.
- Dados corrompidos em `localStorage["love-mimos-favorites"]` →
  recuperação automática para favoritos vazios (via
  `createSafeLocalStorage`), testado explicitamente.
- Favoritar o mesmo produto duas vezes → `add()` verifica existência
  antes de inserir, nunca duplica.

## 7. Onde o botão de favoritar aparece

`ProductCard` (canto superior direito — o único canto livre, já que
badge/esgotado ocupam o superior esquerdo e desconto o inferior direito)
e `ProductDetail` (ao lado do nome do produto). Um ícone de coração com
badge de contagem no `Header`, ao lado do carrinho — mesmo padrão visual,
não um elemento novo.

## 8. O que essa feature não faz (ainda)

Sincronizar entre dispositivos ou com uma conta de cliente (ver
[ROADMAP.md](../ROADMAP.md) — login é explicitamente fora de escopo por
enquanto), compartilhar lista de favoritos via WhatsApp, ou qualquer
recomendação baseada em favoritos — tudo isso fica para quando essas
features entrarem, com a base de dados (`addedAt`) já pronta para
suportar.
