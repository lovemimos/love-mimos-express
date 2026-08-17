# Relatório da Sprint 5A — Preparação para Homologação Real

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [API_TINY.md](./API_TINY.md), [ARCHITECTURE_REVIEW_SPRINT_5.md](./ARCHITECTURE_REVIEW_SPRINT_5.md)
> (Sprint 5) e [SPRINT_5_REPORT.md](./SPRINT_5_REPORT.md) (NO-GO anterior)

## Leitura prévia

`PROJECT_VISION.md`, `DESIGN_SYSTEM.md`, `ENGINEERING_GUIDELINES.md`,
`API_TINY.md` foram lidos antes de qualquer alteração. `CLAUDE.md` foi
procurado e **não existe** no projeto — seguimos sem ele, como em todas
as sprints anteriores.

## Escopo respeitado

- ❌ Não conectado ao Tiny (nenhuma chamada real feita).
- ❌ Nenhuma credencial real usada — todo o desenvolvimento e todos os
  testes usam valores fictícios (`"test-client-id"`, `"changeme"`, etc.).
- ❌ Nenhum dado criado.
- ❌ Nenhuma regra de negócio alterada.
- ✅ `MockProductRepository`/`MockCategoryRepository` mantidos
  integralmente — continuam sendo `DATA_SOURCE` padrão.

## 1. Revisão da implementação existente

Revisão completa de `tiny-client.ts`, `tiny-product-repository.ts`,
`tiny-category-repository.ts`, `tiny-mapper.ts`, `env.ts`, `status.ts`
(todos herdados das Sprints 4 e 5). Nenhum problema estrutural
encontrado — a base já era sólida (fallback controlado, cache separado
por fonte, `server-only` em toda a cadeia). As melhorias desta sprint são
aditivas, não correções de bugs críticos.

## 2. `.env.example`: revisado e uma lacuna corrigida

Confirmado: contém só nomes de variável e valores fictícios/placeholder,
nenhuma credencial real. **Lacuna encontrada**: `NEXT_PUBLIC_SITE_URL`
(usada em `src/app/layout.tsx` desde a Sprint de Branding) nunca tinha
sido documentada aqui — corrigido.

## 3. Validação centralizada — ausência **e** invalidez

`validateTinyEnv()` (`src/lib/env.ts`) agora detecta, além de variável
ausente, uma variável **presente mas com formato suspeito**: contém
espaço em branco, tem menos de 8 caracteres, ou é um placeholder óbvio
(`changeme`, `xxx`, `test`, etc.). A mensagem de erro sempre lista só
*nomes* de variável, nunca um valor — testado explicitamente em
`env.test.ts` (a mensagem nunca contém o valor configurado, mesmo em
cenários com credencial inválida presente).

`TINY_REQUEST_TIMEOUT_MS` ganhou sua própria validação
(`resolveRequestTimeoutMs()`): um valor não numérico ou não positivo cai
para o padrão de 8000ms com um aviso claro, em vez de produzir um
timeout de `NaN`ms (que na prática vira "sem timeout algum").

## 4. Logs melhorados

Todo log da integração passa agora por `src/lib/repositories/tiny/logger.ts`
— um único módulo, mais fácil de auditar quanto a vazamento de dado
sensível do que chamadas `console.*` espalhadas. Cobre exatamente o que
foi pedido: início de conexão, autenticação (com duração), endpoint
chamado (com duração e status), quantidade de registros retornados,
timeout, erro de rede, tentativa de retry, alerta de rate limit baixo, e
fallback. Nenhuma função de log aceita um valor que possa conter
credencial — todas recebem só strings/números já sanitizados
(paths, durações, contagens, "kind" do erro).

## 5. Utilitário de diagnóstico interno

`/dev/tiny-status` (`src/app/dev/tiny-status/page.tsx`) — mostra fonte de
dados ativa, status de configuração de cada credencial (✅/❌, nunca o
valor), e saúde da integração (último sucesso, fallback ativo, motivo do
último fallback). **Confirmado por teste real**: retorna HTTP 404 em
build de produção (`next build && next start`) e HTTP 200 com conteúdo
correto em `next dev`.

## 6. Timeout, retry, e códigos HTTP

Revisão + reforço:

| Cenário | Comportamento | Retentado? |
|---|---|---|
| Timeout | `TinyApiError(kind: "timeout")` | Sim (até 2x) |
| Erro de rede | `TinyApiError(kind: "network")` | Sim (até 2x) |
| HTTP 401 | `TinyApiError(kind: "auth", status: 401)` | **Não** |
| HTTP 403 | `TinyApiError(kind: "auth", status: 403)` | **Não** |
| HTTP 404 | `TinyApiError(kind: "http", status: 404)` | **Não** |
| HTTP 429 | `TinyApiError(kind: "http", status: 429)` | Sim (até 2x) |
| HTTP 500 | `TinyApiError(kind: "http", status: 500)` | Sim (até 2x) |

Retry novo nesta sprint (`retry.ts`), com testes confirmando ambos os
lados: sucesso após uma falha transitória, e nenhuma retentativa em erro
de autenticação.

## 7. Normalizador — compatibilidade ampliada

`tiny-mapper.ts` passou a tolerar formatos que APIs reais às vezes
retornam mesmo quando a documentação promete outra coisa: preço/estoque/
id como string numérica (`"42.90"`, `"38"`), e `situacao` com espaço ou
caixa diferente (`" a "`, `"i"`). Um preço que não é numerizável de jeito
nenhum (ex.: `"sob consulta"`) continua resultando em produto não
mapeado — não em um preço quebrado exibido à cliente.

## 8. Verificação final

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros |
| `npm run test` | ✅ **51/51** |
| `npm run build` | ✅ compila, 22 rotas |
| Rotas de página/API | ✅ todas OK (`/`, `/busca`, `/carrinho`, `/produto/[slug]`, 404, `/api/products`, `/api/categories`) |
| `/dev/tiny-status` em produção | ✅ 404 confirmado |
| `/dev/tiny-status` em desenvolvimento | ✅ 200, conteúdo correto |

## Arquivos alterados/criados

**Criados**: `src/lib/repositories/tiny/logger.ts`,
`src/lib/repositories/tiny/retry.ts`,
`src/lib/repositories/tiny/tiny-client-errors.ts`,
`src/app/dev/tiny-status/page.tsx`, `src/lib/env.test.ts`,
`docs/SPRINT_5A_REPORT.md`.

**Alterados**: `src/lib/env.ts`, `src/lib/repositories/tiny/tiny-client.ts`,
`src/lib/repositories/tiny/tiny-product-repository.ts`,
`src/lib/repositories/tiny/tiny-category-repository.ts`,
`src/lib/repositories/tiny/tiny-mapper.ts`,
`src/lib/repositories/tiny/tiny-client.test.ts`,
`src/lib/repositories/tiny/tiny-mapper.test.ts`, `.env.example`,
`docs/API_TINY.md`, `docs/CHANGELOG.md`.

## Riscos encontrados

- **Nenhum risco novo crítico.** A base da Sprint 5 já era sólida. O
  risco mais relevante continua o mesmo já documentado desde a Sprint 4:
  o padrão N+1 de sincronização (listar IDs → detalhe por produto) ainda
  não tem solução de banco local para catálogos grandes — ver
  [API_TINY.md §11](./API_TINY.md#11-riscos-e-limitações-resumo-consolidado).
- A validação de "credencial inválida" é heurística (comprimento,
  espaço, placeholders conhecidos) — não há especificação oficial do
  formato exato de `client_id`/`client_secret`/`refresh_token` da Tiny,
  então ela pode, em tese, deixar passar uma credencial malformada que
  não bata com nenhuma heurística, ou (menos provável) marcar como
  "suspeita" uma credencial real que seja coincidentemente curta. Isso
  só será confirmado com uma credencial real de verdade.

## Checklist para homologação real (Sprint 5B ou seguinte)

- [ ] Obter `TINY_CLIENT_ID`/`TINY_CLIENT_SECRET` reais (ERP Tiny →
  Configurações → Aplicativos).
- [ ] Completar o fluxo OAuth2 `authorization_code` manualmente uma vez
  para obter o primeiro `TINY_REFRESH_TOKEN` real (ver
  [API_TINY.md §2](./API_TINY.md#2-fluxo-de-autenticação-oauth2)).
- [ ] Configurar as 3 variáveis em `.env` local (nunca versionado) e
  `DATA_SOURCE=tiny`.
- [ ] Verificar `/dev/tiny-status` em `npm run dev` — confirmar que as 3
  credenciais aparecem como "✅ configurado" antes de prosseguir.
- [ ] Executar a Fase 3 do brief da Sprint 5 (homologação read-only
  real, amostra pequena de produtos) — ainda não feita, depende das
  credenciais acima.
- [ ] Executar a Fase 6 da Sprint 5 (validação de interface com dados
  reais da Tiny).
- [ ] Só então reavaliar a recomendação de GO/NO-GO.

## Confirmação: o projeto está pronto para RECEBER credenciais reais?

**Sim.** Toda a camada de validação, log, retry e diagnóstico está no
lugar e testada com valores fictícios. O projeto está pronto para que
alguém com acesso a uma conta Tiny real configure as credenciais
localmente (nunca em arquivo versionado) e prossiga para a homologação
real (Fases 3 e 6 do brief da Sprint 5) — que continua **não realizada**
nesta sprint, propositalmente, por não termos credenciais reais
disponíveis neste ambiente.
