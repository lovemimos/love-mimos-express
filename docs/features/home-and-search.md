# Feature: Home & Busca

> Volta para [README.md](./README.md)

## 1. O que é

As duas telas de entrada para descobrir produto. Não têm pasta própria em
`src/features/` porque não introduzem nenhum componente ou estado que não
pertença à feature de [product](./product.md) — são, na prática, duas
composições diferentes dos mesmos blocos (`SearchBar`, `CategoryPills`,
`SortSelect`, `ProductGrid`) para dois momentos diferentes da jornada.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/app/page.tsx` (Home) | Hero de marca + busca + categorias + grid. Primeira tela ao abrir o link do WhatsApp. Sem paginação visível — pede uma página grande o suficiente para mostrar "tudo". |
| `src/app/busca/page.tsx` | Server Component fino — só renderiza `Header` (imediato) e envolve o conteúdo dinâmico em `<Suspense>` (exigido pelo Next.js sempre que algo usa `useSearchParams`). |
| `src/features/product/components/SearchPageContent.tsx` | O conteúdo de fato da Busca (Client Component) — busca + categorias + ordenação + grid + "carregar mais", com estado sincronizado à URL. |
| `src/lib/repositories/product-query.ts` | **O motor de busca/ordenação/paginação** — função pura, usada por Mock e Tiny igualmente. Ver [product.md](./product.md) para detalhes de arquitetura de dados. |

## 3. Por que duas telas quase iguais

Não é duplicação de código — os dois arquivos só orquestram os mesmos
componentes compartilhados e o mesmo hook de dados (`useProductQuery`);
nenhuma lógica de filtro está copiada entre eles (a Sprint 6 removeu a
última divergência: a Home antes refiltraria em memória um resultado que
o servidor já deveria ter filtrado). A diferença é puramente de
composição e de página/tamanho:

| | Home | Busca |
|---|---|---|
| Hero de marca | Sim | Não |
| Tamanho de página | 100 (mostra "tudo" de uma vez) | 8 (com "carregar mais") |
| Estado na URL | Não (local, `useState`) | Sim (`q`, `categoria`, `ordem`) |
| Ordenação | Não exposta (usa "relevância" implícita) | Exposta via `SortSelect` |

## 4. O motor de busca (Sprint 6)

`src/lib/repositories/product-query.ts` expõe `applyProductQuery(products,
query)` — filtro por categoria → busca textual com pontuação → ordenação
→ paginação, nessa ordem. Chamado por `MockProductRepository.query()` e
`TinyProductRepository.query()` (sobre o catálogo já buscado/cacheado) —
nunca duplicado por repositório, por página, ou entre cliente e servidor.

**Normalização de busca** (`src/utils/normalize-text.ts`): remove
acentos, ignora caixa, colapsa espaços. O termo é dividido em palavras, e
**todas** precisam combinar em algum lugar do produto (nome, descrição
curta, categoria, SKU, ou descrição longa) — nome combinando no início
pontua mais alto que combinar no meio, o que pontua mais que combinar só
na descrição longa. Isso é o que faz `"cilios marrom"` encontrar um
produto chamado "Cílios Marrom Fio a Fio" independente de acento, caixa,
ou ordem das palavras.

**Campos que a busca propositalmente NÃO cobre**: marca e tags/palavras-
chave — esses campos **não existem** no tipo `Product`
(`src/types/index.ts`) hoje. A busca nunca finge procurar num campo que
não existe; se marca/tags forem adicionados ao modelo no futuro, é um
one-line change em `scoreMatch()`.

## 5. Estado na URL (só na Busca)

`SearchPageContent.tsx` usa `useSearchParams`/`useRouter().replace` como
fonte de verdade para `q`/`categoria`/`ordem` — não um `useState` puro.
Isso é o que torna a URL compartilhável e resistente a atualizar a
página. Exemplos suportados:

```
/busca?q=cola
/busca?categoria=cilios
/busca?q=cola&categoria=colas&ordem=menor-preco
```

**Debounce seletivo**: só a escrita na URL (e portanto o refetch de rede)
é debounced (400ms) — o campo de texto em si nunca espera, digitar
sempre parece instantâneo. Pressionar Enter ou usar o botão de limpar
força a sincronização imediatamente, sem esperar o debounce.

**Por que a Home não tem estado na URL**: a Home é a tela de entrada, não
o destino de um link compartilhado — não há um caso de uso real de
"compartilhar o filtro da Home" da mesma forma que "compartilhar um
resultado de busca". Se isso mudar, o mesmo padrão da Busca se aplica
igualmente.

## 6. Paginação: "carregar mais", não paginação clássica

Escolhido em vez de números de página (1, 2, 3...) por ser o padrão mais
coerente com uma experiência mobile de rolagem contínua (ver
[DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) — "priorizar navegação por
gestos"). O número da página **não** vai para a URL — recarregar ou
compartilhar um link de busca sempre volta para a primeira página,
igual a como a maioria dos apps de e-commerce mobile já se comporta com
"carregar mais"; isso é uma escolha de escopo consciente, não uma
limitação técnica (ver [SPRINT_6_REPORT.md](../SPRINT_6_REPORT.md)).

## 7. Estados de interface

`ProductGrid` (`src/features/product/components/ProductGrid.tsx`) cobre:
carregando (skeleton), erro (com botão de tentar novamente), vazio (com
uma ação — "limpar filtros" ou "ver todos os produtos" — nunca um
beco sem saída), e resultado normal. "Busca sem termo" e "categoria sem
produtos" não são estados visuais separados — são só variações da
mensagem de vazio/contagem, com o texto ajustado ao contexto (nome da
categoria, termo buscado).

## 8. Casos de borda tratados

- Termo de busca sem nenhum resultado → estado vazio com ação de limpar.
- Categoria inexistente ou sem produtos → mesma coisa, mensagem
  ajustada.
- Parâmetros de URL inválidos (`ordem` desconhecida, `pagina` negativa,
  `limite` acima do máximo) → `normalizeProductQuery()` aplica fallback
  seguro silenciosamente, nunca quebra a tela — ver
  [product.md](./product.md) e `product-query.test.ts`.
- Falha ao buscar (`/api/products` fora do ar) → estado de erro com
  retry, nunca uma tela em branco sem explicação.

## 9. O que essa feature não faz (ainda)

Sugestões de busca/autocomplete, histórico de buscas recentes, busca por
voz, número de página refletido na URL — nenhum desses foi solicitado
ainda; ver [ROADMAP.md](../ROADMAP.md) antes de priorizar.
