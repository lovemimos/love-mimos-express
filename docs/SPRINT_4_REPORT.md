# Relatório da Sprint 4 — Integração real com a Tiny ERP

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [API_TINY.md](./API_TINY.md) (documentação técnica completa) e
> [ARCHITECTURE.md](./ARCHITECTURE.md) (camadas de código)

## 1. Objetivo da sprint

Implementar a primeira integração real de catálogo com a Tiny ERP,
mantendo a arquitetura desacoplada criada na Sprint 3 — sem tocar em
layout, Design System, fluxo de compra, textos ou componentes visuais.

**Leitura prévia**: `VISION.md`, `PROJECT_VISION.md`, `ROADMAP.md`,
`DESIGN_SYSTEM.md`, `NON_FUNCTIONAL_REQUIREMENTS.md`,
`ENGINEERING_GUIDELINES.md` foram lidos antes de qualquer alteração de
código. `CLAUDE.md` foi procurado no início da sprint e **não existe**
no projeto — seguimos sem ele, como nas sprints anteriores.

## 2. O que foi entregue

### Pesquisa (base para tudo abaixo)

Toda a documentação técnica em [API_TINY.md](./API_TINY.md) foi
reescrita a partir da documentação oficial real da Olist/Tiny ERP API v3
(`api-docs.erp.olist.com`), não de suposições. Achados que mudaram o
plano original:

- `GET /produtos` (listagem) **não retorna** categoria, imagens ou
  variações — só `GET /produtos/{id}` (detalhe) traz esses campos. Isso
  exige um padrão N+1 (listar IDs → buscar detalhe de cada um), documentado
  como o maior risco de escala da integração
  ([API_TINY.md §4](./API_TINY.md#4-limitação-crítica-encontrada-listagem--detalhe)
  e §11).
- `refresh_token` da Tiny expira em 24h — risco real de a integração
  parar silenciosamente sem monitoramento ([API_TINY.md §2](./API_TINY.md#2-fluxo-de-autenticação-oauth2)).
- Categorias da Tiny não têm ícone nem slug amigável — geramos ambos
  (`slugify()` + ícone neutro fixo).
- Tiny não tem rating/reviewCount/badge de marketing — esses campos
  ficam vazios para produtos vindos da Tiny (não é um bug).

### Código

| Arquivo | O que faz |
|---|---|
| `src/lib/env.ts` | Config server-only: `DATA_SOURCE`, credenciais Tiny |
| `src/lib/repositories/tiny/tiny-client.ts` | OAuth2 (renovação de token), timeout, parsing de rate-limit, logs sanitizados |
| `src/lib/repositories/tiny/tiny-mapper.ts` | Funções puras: payload Tiny → `Product`/`Category` |
| `src/lib/repositories/tiny/tiny-product-repository.ts` | `ProductRepository` real: paginação, cache, fallback controlado |
| `src/lib/repositories/tiny/tiny-category-repository.ts` | `CategoryRepository` real |
| `src/lib/repositories/tiny/cache.ts` | Cache TTL em memória |
| `src/lib/repositories/index.ts` | Composition root — escolhe Mock ou Tiny via `DATA_SOURCE`, com fallback de configuração |
| `src/app/api/products/route.ts`, `src/app/api/categories/route.ts` | Route Handlers — nova fronteira cliente/servidor (ver §3) |
| `.env.example` | Variáveis documentadas |

### Correção de arquitetura não planejada originalmente

Durante a implementação, identificamos que `src/hooks/useProducts.ts`
(usado por Client Components) chamava `catalogService` diretamente — o
que colocaria código capaz de autenticar com a Tiny ao alcance do
navegador. Corrigido introduzindo Route Handlers
(`src/app/api/products`, `src/app/api/categories`) como a única ponte
entre hooks client-side e o `catalogService`/Tiny, e marcando toda a
cadeia server-only (`catalog-service.ts`, `repositories/index.ts`,
`repositories/tiny/**`) com o pacote `server-only`, que faz o **build
falhar** se algum Client Component importar esse código, mesmo
indiretamente. Detalhes em
[ARCHITECTURE.md §7](./ARCHITECTURE.md#7-fronteira-clienteservidor-sprint-4-route-handlers).

### `MockProductRepository`/`MockCategoryRepository`

Mantidos exatamente como estavam — continuam sendo o padrão
(`DATA_SOURCE=mock`) e o fallback de qualquer falha da Tiny.

## 3. Testes

Framework: **Vitest** (adicionado nesta sprint — o projeto não tinha
nenhum runner de teste até agora).

| Suite | Cobre |
|---|---|
| `tiny-mapper.test.ts` (15 testes) | Mapeamento completo, produto sem imagem (array vazio e campo ausente), produto sem estoque (`null` e campo ausente), produto inativo (`situacao: "I"`), produto excluído (`situacao: "E"`), produto sem preço, produto sem nome, badge automático de promoção, cálculo de `priceModifier` de variação, ausência de rating/reviewCount, fallback de categoria, achatamento da árvore de categorias |
| `tiny-client.test.ts` (3 testes) | Falha de autenticação (401 no endpoint de token), timeout (abort), 401 numa chamada de dados com token já válido |
| `tiny-product-repository.test.ts` (5 testes) | Resposta vazia (sem itens), paginação (múltiplas páginas até cobrir o total), fallback controlado (`findAll`/`findBySlug`), produto inativo filtrado do resultado final |

**Resultado**: `npm run test` → **23/23 testes passando**.

## 4. Validação final

| Verificação | Comando | Resultado |
|---|---|---|
| Build | `npm run build` | ✅ compila, 18 páginas + 2 Route Handlers dinâmicos |
| Lint | `npm run lint` | ✅ 0 warnings, 0 erros |
| Testes | `npm run test` | ✅ 23/23 |
| Rotas (mock, padrão) | `/`, `/busca`, `/carrinho`, `/produto/[slug]` (×2), 404 | ✅ todas OK |
| API routes (mock) | `GET /api/products`, `?search=cola`, `GET /api/categories` | ✅ retornam JSON correto (12 produtos, 3 resultados de busca, 6 categorias) |
| `DATA_SOURCE=tiny` sem credenciais | Servidor sobe, `/` e `/api/products` respondem | ✅ cai para mock com aviso no log, nenhuma rota quebra |

## 5. O que NÃO foi feito (fora de escopo ou risco aceito)

- **Nenhuma chamada real à Tiny foi testada contra uma conta de verdade**
  — não há credenciais de uma conta Tiny real disponíveis neste ambiente.
  Toda a implementação foi validada via testes com `fetch`/`tinyClient`
  mockados, seguindo exatamente o schema documentado oficialmente (ver
  [API_TINY.md](./API_TINY.md)) — mas o primeiro teste contra uma conta
  real ainda precisa acontecer antes de considerar a integração
  "confirmada em produção".
- Sincronização em banco local (necessária para catálogos grandes, ver
  risco de N+1 em [API_TINY.md §11](./API_TINY.md#11-riscos-e-limitações-resumo-consolidado)).
- Estados de carregamento reais (skeleton) — o `initialData` do mock
  ainda cobre a primeira pintura da tela mesmo com `DATA_SOURCE=tiny`.
- Layout, Design System, fluxo de compra, textos e componentes visuais:
  **intocados**, como exigido pelo escopo da sprint.

## 6. Documentação atualizada

- `docs/API_TINY.md`: reescrito do zero com achados reais da pesquisa.
- `docs/ARCHITECTURE.md`: novas seções §7 (fronteira cliente/servidor) e
  §8 (integração Tiny real); ajustes de wording nas seções antigas que
  tratavam a Tiny como hipotética.
- `docs/ROADMAP.md`: itens da Fase 2 marcados como concluídos onde
  corresponde à realidade; novos itens abertos para os riscos reais
  encontrados (N+1, cache multi-instância).
- `docs/NON_FUNCTIONAL_REQUIREMENTS.md`: âncoras corrigidas, linguagem
  atualizada de "quando a Tiny entrar" para o estado real.
- `docs/CHANGELOG.md`: entrada `v0.11.0` (ver changelog para o detalhe
  completo).
- `.env.example`: novo.
