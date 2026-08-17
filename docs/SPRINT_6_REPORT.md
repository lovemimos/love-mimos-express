# Relatório da Sprint 6 — Busca e Descoberta de Produtos

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [docs/features/home-and-search.md](./features/home-and-search.md) e
> [docs/features/product.md](./features/product.md)

## Resumo executivo

Busca e navegação por categoria transformadas em experiência funcional,
rápida e com estado representado na URL — funcionando identicamente sobre
`MockProductRepository` (ativo hoje) e `TinyProductRepository` (aguardando
confirmação do suporte da Olist/Tiny, sem nenhuma mudança na arquitetura
preparada para ela). O núcleo da entrega é um único motor de consulta
(`applyProductQuery`) compartilhado por ambos os repositórios — busca
tolerante a acento/caixa/espaço com correspondência parcial e múltiplas
palavras, filtro de categoria combinável, ordenação (relevância/menor
preço/maior preço/nome A-Z), e paginação via "carregar mais". A tela de
Busca (`/busca`) passou a refletir seu estado (`q`, `categoria`, `ordem`)
na URL, tornando-a compartilhável e resistente a atualizar a página.

**Leitura prévia**: `VISION.md`, `docs/PROJECT_VISION.md`,
`docs/ROADMAP.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`,
`docs/ENGINEERING_GUIDELINES.md`, `docs/features/home-and-search.md`,
`docs/features/product.md`, `docs/CHANGELOG.md` — todos lidos antes de
qualquer alteração. `CLAUDE.md` foi procurado e **não existe** no
projeto — seguimos sem ele, como em todas as sprints anteriores.

## Arquivos criados

- `src/lib/repositories/product-query.ts` — motor de busca/ordenação/paginação
- `src/utils/normalize-text.ts` — normalização de texto para busca
- `src/features/product/components/SortSelect.tsx` — seletor de ordenação
- `src/features/product/components/SearchPageContent.tsx` — conteúdo da Busca (extraído para permitir `<Suspense>`)
- `src/utils/normalize-text.test.ts`
- `src/lib/repositories/product-query.test.ts`
- `src/lib/repositories/product-repository-contract.test.ts`
- `docs/SPRINT_6_REPORT.md`

## Arquivos alterados

- `src/lib/repositories/contracts.ts` — novo método `query()` no `ProductRepository`
- `src/lib/repositories/mock/mock-product-repository.ts`
- `src/lib/repositories/tiny/tiny-product-repository.ts`
- `src/services/catalog-service.ts` — novo método `queryProducts()`
- `src/app/api/products/route.ts` — novo conjunto de parâmetros/resposta
- `src/hooks/useProducts.ts` — `useProductQuery` substitui `useProducts`/`useProductSearch`
- `src/app/page.tsx` (Home)
- `src/app/busca/page.tsx` — virou shell fino com `<Suspense>`
- `src/features/product/components/SearchBar.tsx`
- `src/features/product/components/ProductGrid.tsx`
- `src/features/product/components/ProductCard.tsx`
- `src/features/cart/hooks/useCartLines.ts` — atualizado para o novo hook
- `docs/features/home-and-search.md`, `docs/features/product.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`

## Decisões técnicas

1. **Um motor, dois repositórios**: em vez de cada repositório
   implementar sua própria busca/ordenação/paginação,
   `applyProductQuery()` faz isso uma vez, sobre um `Product[]` já
   resolvido. `MockProductRepository` chama sobre o array estático;
   `TinyProductRepository` chama sobre o catálogo já buscado/cacheado
   (ver `docs/API_TINY.md §11` — a Tiny não permite empurrar esse tipo de
   filtro combinado para sua própria API). Isso elimina uma divergência
   real que existia antes: a implementação de busca da Tiny não
   normalizava acento, a do mock também não.
2. **Contrato ampliado, não substituído**: `findAll`/`findByCategory`/
   `search` continuam existindo (agora como wrappers sobre `query()`) —
   nenhum chamador existente quebrou.
3. **URL como fonte de verdade só na Busca, não na Home**: a Home é a
   tela de entrada (sem caso de uso real de "compartilhar o filtro da
   Home"); a Busca é o destino natural de um link compartilhado. Ver
   justificativa completa em
   [home-and-search.md §5](./features/home-and-search.md#5-estado-na-url-só-na-busca).
4. **Debounce seletivo**: o campo de texto nunca espera — só a escrita
   na URL (400ms) e o refetch que ela aciona são debounced. Enter/submit
   flush imediato.
5. **"Carregar mais" em vez de paginação numerada**: mais coerente com
   gestos mobile (ver Design System). O número da página **não** vai
   para a URL — decisão de escopo consciente (§ "Itens adiados").
6. **`<Suspense>` obrigatório**: descoberto durante o build (não era
   óbvio de antemão) — `useSearchParams()` exige um limite de Suspense.
   Resolvido extraindo o conteúdo interativo para
   `SearchPageContent.tsx` e deixando `busca/page.tsx` como um shell que
   renderiza o `Header` imediatamente (sem depender de `useSearchParams`)
   e só envolve o resto em `<Suspense>`.
7. **Seletor de ordenação nativo (`<select>`)**: em vez de um componente
   de dropdown customizado — respeita a regra de não iniciar uma nova
   sprint de branding/Design System.

## Contrato final de busca

```ts
type ProductSortOrder = "relevancia" | "menor-preco" | "maior-preco" | "nome-asc";

type ProductQuery = {
  search?: string;
  categorySlug?: string;
  sort?: ProductSortOrder;
  page?: number;        // 1-based
  pageSize?: number;
  onlyAvailable?: boolean; // stock > 0
  featuredOnly?: boolean;  // tem badge (novo/mais-vendido/promocao)
};

type ProductQueryResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
```

Implementado por `ProductRepository.query(params): Promise<ProductQueryResult>`.
Nenhum campo é específico da Tiny — a API da Tiny não tem, por exemplo,
conceito de "ordenar por relevância de busca textual"; esse cálculo
acontece inteiramente do lado da Love Mimos, sobre o catálogo já obtido.

## Parâmetros suportados na URL (`/busca`)

| Parâmetro | Exemplo | Efeito |
|---|---|---|
| `q` | `?q=cola` | Busca textual (nome, descrição curta/longa, categoria, SKU) |
| `categoria` | `?categoria=cilios` | Filtro de categoria |
| `ordem` | `?ordem=menor-preco` | `relevancia` (padrão, omitido da URL) \| `menor-preco` \| `maior-preco` \| `nome-asc` |

Combináveis livremente: `/busca?q=cola&categoria=colas&ordem=menor-preco`.
`pagina`/`limite` existem no contrato e no `/api/products`, mas **não**
são escritos na URL da tela `/busca` — ver "Itens adiados".

## Cenários testados

**Automatizados (90/90 testes, 39 novos)**: normalização de texto (acento,
caixa, espaço), busca sem acento, busca parcial, múltiplas palavras com
semântica "E", combinação busca+categoria (interseção, não união),
ordenação por menor/maior preço e nome A-Z, relevância priorizando
correspondência no início do nome, paginação (tamanho de página,
`hasMore`, sem sobreposição entre páginas, página além do total),
disponibilidade e destaque, parâmetros inválidos (ordem desconhecida,
página negativa/zero/não-numérica, limite acima do máximo/zero/negativo)
com fallback seguro, e compatibilidade de contrato (mesma suíte rodada
contra `MockProductRepository` e `TinyProductRepository`).

**Manuais (via curl, servidor real rodando)**:

| URL | Resultado |
|---|---|
| `/busca?q=cola` | HTTP 200 |
| `/busca?categoria=cilios` | HTTP 200 |
| `/busca?q=cola&categoria=colas&ordem=menor-preco` | HTTP 200 |
| `/api/products?categoria=cilios&ordem=menor-preco` | `total: 3`, preços em ordem crescente (29.9 → 42.9 → 47.5) |
| `/api/products?q=cola+marrom+xyz` | `total: 0`, `items: []`, sem erro |
| `/api/products?limite=3&pagina=1` depois `pagina=2` | Páginas sem sobreposição, `hasMore` correto |
| `/api/products?ordem=xyz&pagina=-5&limite=99999` | HTTP 200 — fallback seguro, não quebra |
| `/produto/nao-existe` | HTTP 404 (inalterado) |

## Riscos e limitações

- **Catálogo mock pequeno (12 produtos)**: "carregar mais" é
  demonstrável (`pageSize=8` na Busca dá 2 páginas), mas o teste real de
  escala (centenas/milhares de produtos, relevante quando a Tiny entrar)
  não foi possível neste ambiente — o motor de busca roda em memória
  sobre o array já carregado, o que já era uma limitação conhecida desde
  [API_TINY.md §11](./API_TINY.md#11-riscos-e-limitações-resumo-consolidado)
  (padrão N+1 de sincronização), não uma novidade desta sprint.
- **Relevância é uma heurística própria**, não um algoritmo de busca de
  texto completo (sem stemming, sem fuzzy matching além de substring) —
  suficiente para um catálogo pequeno/médio, pode precisar de revisão se
  o catálogo crescer muito ou os termos de busca ficarem mais complexos.
- **Nenhum teste de carga/performance real** foi executado — a avaliação
  de performance desta sprint foi por revisão de código (evitar filtro
  duplicado, evitar loops excessivos), não por medição sob carga.

## Itens propositalmente adiados

- **Sugestões de busca/autocomplete** e **histórico de buscas recentes**
  — não solicitados nesta sprint; candidatos naturais para uma sprint
  futura de refinamento de conversão (ver `ROADMAP.md` Fase 3).
- **Número da página de "carregar mais" na URL** — decisão consciente de
  manter fora: "carregar mais" é, por natureza, um padrão de rolagem
  contínua onde recarregar a página volta ao início (mesmo
  comportamento de apps de e-commerce mobile estabelecidos) — colocar o
  número da página na URL adicionaria complexidade sem um benefício de
  UX claro nesse padrão específico (diferente de paginação numerada
  clássica, onde isso faria sentido).
- **Fora de escopo por regra explícita da sprint** (não tocados):
  favoritos, login, assistente Lumi, checkout novo, painel
  administrativo, escrita na Tiny.

## Resultado de lint, testes e build

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros, 0 avisos |
| `npm run test` | ✅ **90/90** (39 testes novos desta sprint) |
| `npm run build` | ✅ compila, 22 rotas |

## Critérios de aceite — status

- [x] A busca funciona utilizando a fonte de dados configurada (Mock hoje).
- [x] Nenhuma página acessa mocks diretamente — confirmado por grep
  (só `mock-product-repository.ts`/`mock-category-repository.ts` e a
  exceção documentada de `initialData` em `useProducts.ts` importam o
  mock).
- [x] Busca textual e categoria funcionam juntas (interseção).
- [x] A URL representa o estado da busca (`q`, `categoria`, `ordem`).
- [x] Atualizar ou compartilhar a URL preserva os resultados.
- [x] Ordenação funciona corretamente (testado automaticamente e
  manualmente).
- [x] Estados vazios e de erro estão tratados, com ação.
- [x] Mobile-first mantido — nenhuma mudança de layout/Design System.
- [x] Todos os testes passam (90/90).
- [x] O build passa.
- [x] O lint passa.
