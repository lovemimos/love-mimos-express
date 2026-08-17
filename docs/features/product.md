# Feature: Product

> Volta para [README.md](./README.md)

## 1. O que é

Tudo relacionado a navegar e conhecer o catálogo: cards de produto, grid,
filtro por categoria, busca e a página de detalhe individual. É a maior
parte da superfície de decisão da cliente antes de comprar — quanto mais
claro isso for, menos mensagem de dúvida sobra pro WhatsApp.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `ProductCard.tsx` | Card de produto no grid — imagem, badge, disponibilidade (esgotado), desconto, preço, nota. Não busca dado nenhum, só recebe `Product` já resolvido. |
| `ProductGrid.tsx` | Layout de grid 2 colunas + estados de carregando/erro/vazio (com ação). Anima a entrada da lista com Framer Motion (stagger) — ver [ENGINEERING_GUIDELINES.md §6](../ENGINEERING_GUIDELINES.md#6-animação-discreta-e-com-propósito). |
| `ProductBadge.tsx` | As três variantes fixas de badge (`novo`/`mais-vendido`/`promocao`). Vive na feature de produto, não em `components/ui/`, porque é específico desse domínio — ver regra em [ENGINEERING_GUIDELINES.md §5](../ENGINEERING_GUIDELINES.md#5-componentização). |
| `CategoryPills.tsx` | Filtro de categoria por pills horizontais. Usa `TogglePill` (`components/ui/toggle-pill.tsx`) — não tem lógica de estilo própria, só decide o que renderizar. |
| `SearchBar.tsx` | Input controlado, sem debounce visual — a digitação sempre parece instantânea (só a escrita na URL, na Busca, é debounced — ver [home-and-search.md §5](./home-and-search.md#5-estado-na-url-só-na-busca)). Submete no Enter, previne submissão vazia. |
| `SortSelect.tsx` (Sprint 6) | Seletor de ordenação (relevância/menor preço/maior preço/nome A-Z) — `<select>` nativo estilizado, deliberadamente não um componente visual novo. |
| `ProductGallery.tsx` | Galeria com paginação por dots na página de detalhe. Hoje mostra `ProductImagePlaceholder`; troca por `<Image>` real é local a esse arquivo. |
| `ProductDetail.tsx` | Orquestra a tela inteira de detalhe: estado de variação/quantidade, adicionar ao carrinho, e o atalho "Comprar agora" (ver [checkout-whatsapp.md](./checkout-whatsapp.md)). |

## 3. Fluxo de dados

```
src/lib/data/products.ts (mock) ──┐
                                   ├─→ ProductRepository.query() (Mock ou Tiny)
src/lib/repositories/product-query.ts (motor de busca/ordenação/paginação, compartilhado)
        ↓
src/services/catalog-service.ts (queryProducts)
        ↓
src/app/api/products/route.ts (Route Handler — só aqui a fronteira cliente/servidor é cruzada)
        ↓
src/hooks/useProducts.ts (useProductQuery, useCategories — via React Query)
        ↓
HomePage / SearchPageContent (src/app) — passam a query já pronta, sem refiltrar em memória
        ↓
ProductGrid → ProductCard  (lista)
        ou
ProductDetail              (item único, via Server Component em src/app/produto/[slug]/page.tsx)
```

A página de detalhe (`src/app/produto/[slug]/page.tsx`) é Server Component
e busca o produto via `catalogService.getProduct()` — não passa pelo hook
de React Query, porque não precisa de cache client-side numa página que
já é renderizada no servidor. Home e Busca são Client Components e usam
`useProductQuery` porque filtram interativamente sem reload. Detalhes
completos do motor de busca em [home-and-search.md §4](./home-and-search.md#4-o-motor-de-busca-sprint-6).

## 4. Decisões e por quê


- **Debounce seletivo, não ausência de debounce (atualizado na Sprint 6)**:
  o campo de busca em si nunca é debounced — digitar sempre parece
  instantâneo. Na Busca, só a escrita na URL (e o refetch que ela
  aciona) é debounced (400ms), porque é aí que o custo real está —
  mesmo com o catálogo mock pequeno hoje, isso já prepara o terreno para
  quando a busca bater direto na Tiny a cada requisição. A Home não
  debounce nem isso, porque não escreve na URL — ver
  [home-and-search.md §5](./home-and-search.md#5-estado-na-url-só-na-busca).
- **Filtro de categoria e busca são independentes e combináveis**: dá pra
  buscar dentro de uma categoria já selecionada — reduz cliques em vez de
  forçar escolher um ou outro.
- **`ProductGallery` com dots em vez de swipe real**: dado que hoje só
  existem 1-2 imagens/placeholders por produto, dots bastam. Se as fotos
  reais trouxerem 4+ imagens por produto, vale revisitar para gesto de
  swipe (ver princípio de "priorizar navegação por gestos" em
  [ENGINEERING_GUIDELINES.md](../ENGINEERING_GUIDELINES.md#1-objetivo-do-produto)).

## 5. Casos de borda tratados

- Slug de produto inexistente → `notFound()` (HTTP 404), testado em
  [DELIVERY.md](../DELIVERY.md#2-o-que-foi-verificado-antes-da-entrega).
- Busca/filtro sem resultado → estado vazio dedicado em `ProductGrid`, não
  uma tela em branco.
- Produto sem `variants` → seção "Escolha a variação" simplesmente não
  renderiza (`ProductDetail`), sem espaço vazio ou placeholder desnecessário.
- Quantidade limitada ao `stock` do produto (`QuantityStepper` recebe
  `max={product.stock}`).

## 6. O que essa feature não faz (ainda)

Estoque em tempo real e imagens reais dependem da integração com a Tiny —
ver [API_TINY.md](../API_TINY.md) e Fase 2 do [ROADMAP.md](../ROADMAP.md).
Favoritos/lista de desejos também não existem — Fase 3 do roadmap.
