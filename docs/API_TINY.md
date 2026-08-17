# Integração com a Tiny ERP API

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [ARCHITECTURE.md](./ARCHITECTURE.md) (camadas de código) e
> [SPRINT_4_REPORT.md](./SPRINT_4_REPORT.md) (o que foi entregue nesta sprint)

> **Fonte**: toda informação técnica abaixo vem da documentação oficial
> em `api-docs.erp.olist.com` (índice completo em
> `api-docs.erp.olist.com/llms.txt`) e da Central de Ajuda da Olist
> (`ajuda.olist.com`), consultadas em julho de 2026. Onde alguma
> informação depende de configuração/plano da conta, isso está marcado
> explicitamente — nada neste documento foi inventado.

## 1. Status: implementado nesta sprint, mock continua como padrão

A partir da Sprint 4, `TinyProductRepository` e `TinyCategoryRepository`
(`src/lib/repositories/tiny/`) implementam as interfaces
`ProductRepository`/`CategoryRepository` (ver
[ARCHITECTURE.md](./ARCHITECTURE.md)) contra a API real da Tiny.
**`DATA_SOURCE=mock` continua sendo o padrão** — a troca para Tiny é
opt-in via variável de ambiente (ver `.env.example`), e mesmo com
`DATA_SOURCE=tiny`, se as credenciais não estiverem configuradas, o app
cai para o mock automaticamente com um aviso no log, em vez de quebrar.

## 2. Fluxo de autenticação (OAuth2)

Fonte: [`Autenticação e autorização`](https://api-docs.erp.olist.com/documentacao/comecando/autenticacao).

A Tiny/Olist usa OAuth2 **Authorization Code** — não um token estático:

1. **Solicitação de autorização** — redirecionar o usuário (humano, uma
   vez) para:
   ```
   https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth
     ?client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&scope=openid&response_type=code
   ```
2. **Código de autorização** — a Tiny redireciona de volta com um `code`.
3. **Troca por token** — `POST` para
   `https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token`
   com `grant_type=authorization_code`, `client_id`, `client_secret`,
   `redirect_uri`, `code` → devolve `access_token` + `refresh_token`.
4. **Uso**: `Authorization: Bearer {access_token}` em toda chamada.
5. **Renovação**: o `access_token` **expira em 4 horas**. Renovar com
   `grant_type=refresh_token` no mesmo endpoint de token, usando
   `client_id` + `client_secret` + `refresh_token`.

**Risco real e documentado**: o `refresh_token` tem duração de **1 dia**.
Isso significa que, se o servidor da Love Mimos ficar mais de 24h sem
fazer nenhuma chamada (ou sem obter um `refresh_token` novo a cada
renovação — a documentação oficial não deixa explícito se cada renovação
devolve um `refresh_token` novo, rotativo, ou reutiliza o mesmo), a
integração pode parar de funcionar silenciosamente até alguém reautorizar
manualmente pelo navegador. **Isso não tem solução de código** — é uma
característica do fluxo OAuth2 da Tiny. Mitigação prática: um processo
(cron/alerta) que monitore falhas de autenticação nos logs
(`[tiny] falha ao renovar token`) e notifique a equipe antes que o
catálogo pare de atualizar.

O passo 1-3 (obtenção do primeiro `refresh_token`) é manual e feito uma
única vez fora do código da aplicação — ver `.env.example` e
`TINY_REFRESH_TOKEN`. O código (`src/lib/repositories/tiny/tiny-client.ts`)
só faz o passo 5 (renovação), automaticamente.

### Criando o aplicativo na Tiny

Fonte: [Central de Ajuda — Aplicativos API V3](https://ajuda.olist.com/hubs-e-plataformas-via-api/aplicativos-api-v3-configuracoes-e-utilizacao).
No ERP: **Configurações → Aplicativos → "+ novo aplicativo"**. Isso gera
`client_id`/`client_secret` e permite restringir permissões por módulo —
recomendado: acesso **somente-leitura** aos módulos Produtos, Estoque e
Categorias para esta integração (a Love Mimos não escreve nada na Tiny).

## 3. Base da API e endpoints usados

Base URL: `https://api.tiny.com.br/public-api/v3` (confirmado no OpenAPI
spec oficial). Todos os endpoints abaixo foram confirmados na
documentação oficial, não inferidos:

| Endpoint | Fonte | Uso |
|---|---|---|
| `GET /produtos` | [Listar produtos](https://api-docs.erp.olist.com/api-reference/produtos/listar-produtos) | Lista paginada, **resposta enxuta** (ver §4) |
| `GET /produtos/{idProduto}` | [Obter produto](https://api-docs.erp.olist.com/api-reference/produtos/obter-produto) | Detalhe completo — única fonte de categoria/imagens/variações |
| `GET /produtos/{idProduto}/anexos` | [Obter anexos e imagens do produto](https://api-docs.erp.olist.com/api-reference/produtos/obter-anexos-e-imagens-do-produto) | Anexos/imagens isolados (não usado — já vêm em `/produtos/{id}`) |
| `GET /estoque/{idProduto}` | [Obter o estoque de um produto](https://api-docs.erp.olist.com/api-reference/estoque/obter-o-estoque-de-um-produto) | Estoque detalhado por depósito (não usado nesta sprint — o campo `estoque.quantidade` já vem no detalhe do produto) |
| `GET /categorias/todas` | [Listar árvore de categorias](https://api-docs.erp.olist.com/api-reference/categorias/listar-árvore-de-categorias) | Árvore completa de categorias |

## 4. Limitação crítica encontrada: listagem ≠ detalhe

Esta é a descoberta mais importante desta sprint, e muda a estratégia de
sincronização.

O schema oficial de `GET /produtos` (`ListagemProdutosResponseModel`) só
retorna: `id`, `sku`, `descricao`, `tipo`, `situacao`, `dataCriacao`,
`dataAlteracao`, `unidade`, `gtin`, `precos`, `estoque.localizacao`,
`tipoVariacao`. **Não inclui** `categoria`, `anexos` (imagens),
`variacoes` nem `seo`.

Esses campos só existem no schema de `GET /produtos/{idProduto}`
(`ObterProdutoModelResponse`).

**Consequência**: para montar o catálogo completo que a Love Mimos
precisa (com categoria, imagens e variações), é necessário:
1. Paginar `GET /produtos` para coletar todos os IDs ativos.
2. Chamar `GET /produtos/{id}` **individualmente para cada ID**.

Isso é um padrão N+1 — para um catálogo de 500 produtos, são 500+
chamadas HTTP só para montar o catálogo uma vez. Ver risco detalhado em
§11.

## 5. Mapeamento de campos (Tiny → modelos internos)

Implementado em `src/lib/repositories/tiny/tiny-mapper.ts`, testado em
`tiny-mapper.test.ts`.

| Campo Tiny (`ObterProdutoModelResponse`) | Campo interno (`Product`) | Observação |
|---|---|---|
| `id` (integer) | `id` (convertido para string) | — |
| `sku` | `sku` | — |
| `descricao` | `name` **e** `shortDescription` | Tiny não distingue nome curto/longo — ver §10 |
| `descricaoComplementar` | `description` | Se ausente, cai para `descricao` |
| `precos.preco` | `price` | `number`, já em reais (não centavos) |
| `precos.precoPromocional` | `compareAtPrice` | Se presente, também aciona `badge: "promocao"` (regra derivada — ver §10) |
| `estoque.quantidade` | `stock` | `null`/ausente → `0` |
| `categoria.nome` | `categorySlug` | Slugificado (`slugify()`) — Tiny não tem "slug", só nome. Sem categoria → `"geral"` |
| `anexos[].url` | `images[]` | Filtra nulos; ordem = ordem retornada pela API (sem flag de "imagem principal") |
| `variacoes[].descricao` | `variants[].label` | — |
| `variacoes[].precos.preco` − `precos.preco` (pai) | `variants[].priceModifier` | Calculado, já que nosso modelo usa delta, não preço absoluto |
| `seo.slug` (se houver) + `-{id}` | `slug` | Fallback: `slugify(descricao)-{id}`. O `-{id}` garante unicidade mesmo se o slug do SEO colidir ou estiver vazio |
| `situacao` | *(não exposto)* | `"I"`/`"E"` → produto excluído do catálogo (mapper retorna `null`) |

## 6. Cache e revalidação

- Cache em memória por processo (`src/lib/repositories/tiny/cache.ts`),
  TTL de 60s para produtos e 5min para categorias.
- **Limitação real**: esse cache é por processo — não é compartilhado
  entre instâncias em um deploy serverless/multi-instância (cada cold
  start começa com cache vazio). Para reduzir chamadas à Tiny de forma
  consistente em produção, seria necessário um cache compartilhado
  (Redis, etc.) — fora do escopo desta sprint.
- O `QueryClient` do React Query no cliente (`src/app/providers.tsx`) já
  tem `staleTime` de 60s, então o navegador também evita refetch
  excessivo — as duas camadas de cache (servidor + cliente) são
  independentes uma da outra.

## 7. Timeout e tratamento de erro

`tiny-client.ts` usa `AbortController` com timeout configurável
(`TINY_REQUEST_TIMEOUT_MS`, padrão 8000ms) em toda chamada — tanto na
renovação de token quanto nas chamadas de dados. Toda falha vira um
`TinyApiError` tipado (`kind: "auth" | "timeout" | "http" | "network"`),
nunca um erro genérico não tratado.

**Matriz de tratamento por código HTTP** (testada com mocks controlados
na Sprint 5, ver `tiny-client.test.ts`, já que não altera com o plano ou
a conta): 401 e 403 → `kind: "auth"` (ambos tratados como problema de
autenticação/permissão, já que a Central de Ajuda documenta 403 como
"módulo sem permissão"); 404, 429, 500 → `kind: "http"` (tratados
genericamente — não há necessidade de um caso especial para 429, já que
o efeito desejado, cair no fallback, é o mesmo); JSON corrompido/resposta
inesperada e falha de rede → `kind: "network"`. Em todos os casos, o
repositório (`TinyProductRepository`/`TinyCategoryRepository`) reage da
mesma forma: cai para o mock (ver §9).

**Retry (Sprint 5A)**: `src/lib/repositories/tiny/retry.ts` reexecuta
automaticamente falhas transitórias — `timeout`, `network`, e HTTP
`429`/`5xx` — até 2 vezes (3 tentativas no total), com espera de 300ms/
600ms entre tentativas. **Nunca** reexecuta erros `auth` (401/403) ou
404: uma quarta tentativa com a mesma credencial ruim, ou pedindo o
mesmo recurso inexistente, falharia da mesma forma — só adicionaria
latência sem chance de sucesso.

## 8. Rate limit

Fonte: [Limites de requisição](https://api-docs.erp.olist.com/documentacao/comecando/limites-de-consulta)
e [Central de Ajuda](https://ajuda.olist.com/hubs-e-plataformas-via-api/aplicativos-api-v3-configuracoes-e-utilizacao).

- Limites por minuto, **diferenciados por leitura e escrita** (mais
  generoso para `GET`) — variam por plano contratado:
  - Básico e Crescer: 60/min (30 de escrita)
  - Essencial e Evoluir: 120/min (60 de escrita)
  - Grande e Potencializar: 240/min (100 de escrita)
- **O limite é por conta, não por aplicativo** — se a conta tiver mais de
  um app ativo, todos compartilham o mesmo limite.
- Toda resposta traz os headers `X-RateLimit-Limit`,
  `X-RateLimit-Remaining`, `X-RateLimit-Reset` (segundos até resetar).
  `tiny-client.ts` já loga um aviso quando `X-RateLimit-Remaining` cai
  para 5 ou menos.
- A documentação oficial que consultamos **não especifica um código HTTP
  exclusivo para "limite excedido"** (o spec OpenAPI de cada endpoint
  só documenta 400/401/403/404/500/503) — na prática, tratamos qualquer
  resposta não-`ok` como erro genérico (`kind: "http"`) e caímos no
  fallback, o que já cobre esse caso mesmo sem um tratamento
  específico de "429".

## 9. Fallback controlado

Toda falha em `TinyProductRepository`/`TinyCategoryRepository` (auth,
timeout, HTTP, rede) é capturada e o repositório **cai para
`MockProductRepository`/`MockCategoryRepository`** em vez de propagar o
erro para a UI — implementado e testado (`tiny-product-repository.test.ts`).
Isso significa que uma instabilidade temporária na Tiny nunca derruba o
site — na pior hipótese, a cliente vê o catálogo de demonstração em vez
do catálogo real, o que é preferível a uma tela de erro.

Há também um fallback **de configuração**: se `DATA_SOURCE=tiny` mas as
credenciais não estão todas presentes, `src/lib/repositories/index.ts`
já usa o mock desde a inicialização, com um aviso no log (usando a
validação centralizada e segura de `src/lib/env.ts` — nunca expõe
valores, só nomes de variável ausentes) — nunca tenta instanciar um
cliente Tiny sem credenciais.

**Observabilidade interna (Sprint 5)**: `src/lib/repositories/tiny/status.ts`
mantém, em memória, um registro de qual fonte de dados está ativa, o
horário da última leitura bem-sucedida da Tiny, e se um fallback está em
curso (com o "tipo" do erro, nunca a mensagem completa). Isso não é
exposto por nenhuma rota pública — existe para logs e para uma futura
tela interna/admin (ver [ADMIN_PANEL.md](./ADMIN_PANEL.md)). Em
produção, um fallback é logado com o prefixo distinto
`[tiny][PROD-FALLBACK]`, pensado para ser fácil de filtrar/alertar — ver
requisito de que o fallback não pode ser silencioso em produção
([SPRINT_5_REPORT.md](./SPRINT_5_REPORT.md)).

## 10. Campos disponíveis vs. ausentes

**Disponíveis e mapeados**: nome, descrição, preço, preço promocional,
estoque (quantidade simples), categoria (nome), imagens (URLs), SKU,
variações com preço próprio.

**Ausentes na API da Tiny** (não existe endpoint/campo para isso — não é
falta de implementação nossa):
- **Avaliação/nota de produto (`rating`, `reviewCount`)**: não existe
  conceito de review de produto na Tiny. Esses campos ficam sempre
  `undefined` para produtos vindos da Tiny — só o catálogo mock os
  preenche.
- **Badge de marketing** (`novo`/`mais-vendido`/`promocao`): não existe
  na Tiny. A única inferência honesta que conseguimos fazer a partir de
  dados reais é `promocao` quando há `precoPromocional` — `novo` e
  `mais-vendido` não têm nenhum campo correspondente e nunca serão
  atribuídos automaticamente.
- **Ícone de categoria**: a Tiny não tem esse conceito — toda categoria
  mapeada da Tiny recebe o mesmo ícone neutro (`Sparkles`) até que exista
  uma tabela de mapeamento manual (ícone por categoria).
- **Slug de categoria amigável**: idem — geramos via `slugify(nome)`.
- **Alt-text/texto alternativo de imagem**: os anexos só têm `id`, `url`,
  `externo` (boolean) — nenhum metadado de acessibilidade.
- **Flag de "imagem principal"**: não existe — a ordem de exibição seria
  a ordem em que a API retorna o array `anexos`, sem garantia
  documentada de que essa ordem é estável.
- **Descrição curta vs. longa separadas**: a Tiny só tem `descricao`
  (curta, usada como nome) e `descricaoComplementar` (opcional, mais
  longa) — não há um campo dedicado ao "resumo de uma linha" que a Love
  Mimos usa nos cards.

## 11. Riscos e limitações (resumo consolidado)

| Risco | Por quê | Mitigação atual |
|---|---|---|
| **N+1 na sincronização** (§4) | Listagem não traz categoria/imagens/variações — precisa de 1 chamada de detalhe por produto | Cache de 60s reduz frequência; catálogos grandes (centenas+ de produtos) vão precisar de uma sincronização em background para um banco local em vez de mapear a cada requisição — não implementado nesta sprint |
| **Refresh token expira em 24h** (§2) | Característica do OAuth2 da Tiny, não configurável | Nenhuma automática — recomendado monitorar logs de falha de auth |
| **Rate limit compartilhado por conta** (§8) | Qualquer outro app conectado à mesma conta Tiny consome o mesmo limite | Cache + backoff via fallback; sem coordenação entre apps |
| **Cache não compartilhado entre instâncias** (§6) | Limitação do cache em memória por processo | Aceito nesta sprint; endereçar se o deploy for multi-instância |
| **Categorias sem slug/ícone** (§10) | Tiny não expõe esses conceitos | `slugify()` + ícone neutro (`Sparkles`) para todas |
| **Sem rating/review/badge automático** (§10) | Não existe na API | Campos ficam vazios para produtos Tiny — decisão consciente, não bug |
| **Nenhum código HTTP documentado para rate-limit excedido** (§8) | Doc oficial não especifica | Tratado genericamente como erro HTTP, aciona fallback de qualquer forma |

## 12. O que fica fora desta sprint

- **Escrita** (criar/atualizar produto, preço, estoque) — a Love Mimos só
  lê da Tiny, nunca escreve. Os endpoints de escrita existem na API
  (`POST/PUT/DELETE /produtos`, `/categorias`, etc.) mas não são usados.
- **Pedidos** (`/pedidos`) — o pedido continua fechado via WhatsApp, não
  criado na Tiny (ver [PROJECT_VISION.md](./PROJECT_VISION.md)).
- **Webhooks** — a Tiny oferece webhooks para notificação de mudanças;
  usar isso para invalidar o cache em vez de polling é uma otimização
  futura, não implementada agora.
- **Sincronização em banco local** — necessária para resolver o risco de
  N+1 em catálogos grandes (§11), fica para uma sprint futura.
