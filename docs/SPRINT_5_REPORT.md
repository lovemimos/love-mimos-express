# Relatório da Sprint 5 — Homologação da Integração Tiny

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [ARCHITECTURE_REVIEW_SPRINT_5.md](./ARCHITECTURE_REVIEW_SPRINT_5.md)
> (revisão de arquitetura completa) e [API_TINY.md](./API_TINY.md)

## Decisão final: **NO-GO** para ativar `DATA_SOURCE=tiny` em produção

**Motivo**: esta sprint não teve acesso a uma conta Tiny real (nenhuma
credencial — `TINY_CLIENT_ID`, `TINY_CLIENT_SECRET`, `TINY_REFRESH_TOKEN`
— estava configurada no ambiente de execução). Por regra explícita desta
sprint ("não inventar resultados de uma conta real", "não declarar
homologação concluída sem executar chamadas reais"), a Fase 3
(homologação real, read-only) e a Fase 6 (validação de UI com dados reais
da Tiny) **não foram executadas** — não porque algo falhou, mas porque a
pré-condição (credenciais) nunca esteve disponível.

Tudo que podia ser verificado **sem** uma conta real — arquitetura,
segurança, validação de ambiente, resiliência a erros, cache — foi
verificado e está aprovado (ver detalhes abaixo).

## Leitura prévia

`VISION.md`, `PROJECT_VISION.md`, `ROADMAP.md`, `DESIGN_SYSTEM.md`,
`NON_FUNCTIONAL_REQUIREMENTS.md`, `ENGINEERING_GUIDELINES.md`,
`docs/API_TINY.md`, `docs/SPRINT_4_REPORT.md`, `CHANGELOG.md`,
`.env.example` — todos lidos antes de qualquer alteração. `CLAUDE.md`
foi procurado e **não existe** no projeto.

## Fase 1 — Revisão de arquitetura: ✅ concluída, sem violações

Relatório completo, com o comando exato de cada verificação e o
resultado real obtido, em
[ARCHITECTURE_REVIEW_SPRINT_5.md](./ARCHITECTURE_REVIEW_SPRINT_5.md).
Resumo: nenhum componente acessa a Tiny diretamente, nenhuma tela importa
mocks, `TinyProductRepository`/`TinyCategoryRepository` só são
importados pelo composition root, nenhuma credencial hardcoded, nenhuma
variável `NEXT_PUBLIC_` com segredo, `.gitignore` cobre `.env`, nenhum
log imprime token. Nenhuma correção foi necessária.

## Fase 2 — Preparação para credenciais reais: ✅ concluída

- `.env.example` revisado: confirmado que contém só nomes de variável e
  um valor fictício (`TINY_REDIRECT_URI=http://localhost:3000/api/tiny/callback`,
  que é um placeholder de desenvolvimento local, não uma credencial).
- **Validação centralizada criada**: `validateTinyEnv()` em
  `src/lib/env.ts` — retorna só os *nomes* das variáveis ausentes, nunca
  valores; usada tanto no composition root
  (`src/lib/repositories/index.ts`) quanto disponível para qualquer
  código futuro que precise checar a configuração.
- **Mensagem seguraem caso de ausência**: `[config] Configuração da Tiny
  incompleta — variável(is) ausente(s): TINY_CLIENT_ID, ... . Configure-as
  em .env (nunca em arquivo versionado) — ver .env.example.` — nunca
  contém um valor, só nomes.
- **Rastreador de status interno criado**:
  `src/lib/repositories/tiny/status.ts` — registra em memória a fonte de
  dados ativa, o horário da última leitura bem-sucedida da Tiny, e se um
  fallback está em curso (com o *tipo* do erro, nunca detalhes). Não é
  exposto por nenhuma rota pública.

### Como configurar credenciais para uma homologação real (Fase 3), quando disponíveis

Nenhuma credencial real foi ou deve ser inserida em arquivo versionado.
Para rodar a Fase 3 de fato, alguém com acesso à conta Tiny precisa:

1. **Quais variáveis configurar**: `TINY_CLIENT_ID`, `TINY_CLIENT_SECRET`
   (geradas em ERP Tiny → Configurações → Aplicativos → "+ novo
   aplicativo") e `TINY_REFRESH_TOKEN` (obtido fazendo o fluxo OAuth2
   `authorization_code` uma vez, manualmente, num navegador — ver
   [API_TINY.md §2](./API_TINY.md#2-fluxo-de-autenticação-oauth2)).
2. **Onde configurar**: criar um arquivo `.env` na raiz do projeto
   (copiar de `.env.example`) e preencher os três valores ali — **nunca**
   em `.env.example`, nunca em código, nunca em qualquer arquivo que
   será commitado.
3. **Como verificar que `.env` está ignorado pelo Git**:
   ```bash
   git check-ignore -v .env
   ```
   Deve imprimir uma linha apontando para a regra em `.gitignore` (hoje:
   `.gitignore:4:.env`). Se não imprimir nada, `.env` NÃO está sendo
   ignorado — pare e corrija o `.gitignore` antes de prosseguir.
4. **Como confirmar que nenhuma credencial foi versionada**:
   ```bash
   git log --all -p -- .env          # deve retornar vazio (nenhum histórico)
   git grep -n "TINY_CLIENT_SECRET=." $(git rev-list --all) -- . 2>/dev/null  # busca em todo o histórico
   ```
   Neste ambiente, o repositório local não tem nenhum commit
   (`git status` → "No commits yet"), então não há histórico a
   verificar — mas o comando acima é o que deve ser rodado antes de
   qualquer push para um repositório remoto real.
5. Depois de configurado, definir `DATA_SOURCE=tiny` no mesmo `.env` e
   rodar `npm run dev`/`npm run build` normalmente.

Com isso feito, a Fase 3 (chamada mínima de autenticação e leitura contra
a conta real) pode ser executada numa sprint seguinte.

## Fase 3 — Homologação real (read-only): ❌ NÃO executada

**Sem credenciais disponíveis neste ambiente, nenhuma chamada real foi
feita contra `api.tiny.com.br`.** Nenhum produto real foi consultado,
nenhuma autenticação real foi tentada. Não fabricamos números, campos ou
comportamento — tudo que está em [API_TINY.md](./API_TINY.md) sobre o
schema da API vem da documentação oficial (ver fontes citadas), não de
uma chamada real executada nesta sprint.

## Fase 4 — Resiliência: ✅ concluída (via testes controlados, sem precisar de conta real)

Testar como o *nosso próprio código* reage a diferentes respostas HTTP
não exige uma conta real — só exige simular essas respostas, que é
exatamente o que os testes fazem. `src/lib/repositories/tiny/tiny-client.test.ts`
agora cobre: 401, 403 (ambos → `kind: "auth"`), 404, 429, 500 (→
`kind: "http"`), timeout, JSON corrompido/resposta inesperada e falha de
rede (→ `kind: "network"`/`"timeout"`). `tiny-product-repository.test.ts`
adiciona um teste de payload incompleto (produto com campos essenciais
ausentes) confirmando que um item malformado não derruba o catálogo
inteiro. Total: **31/31 testes passando** (`npm run test`).

Confirmado por leitura de código (não exige conta real): a aplicação
nunca quebra por completo em nenhum desses cenários — todo caminho passa
pelo fallback controlado (§9 de [API_TINY.md](./API_TINY.md)), o erro é
logado sem dados sensíveis, e não há mistura entre cache de dados
mock/Tiny (`MockProductRepository` não usa nenhum cache — ver
verificação abaixo).

## Fase 5 — Cache e consistência: ✅ revisado

- **Chave de cache**: `tiny:products:all`, `tiny:categories:all` — fixas,
  únicas por tipo de recurso.
- **TTL**: 60s (produtos), 5min (categorias) — ver `tiny-product-repository.ts`/
  `tiny-category-repository.ts`.
- **Separação mock/Tiny**: confirmada por grep —
  `MockProductRepository`/`MockCategoryRepository` não importam nem usam
  `tinyCache` em nenhum lugar. As duas fontes nunca compartilham cache.
- **Comportamento após falha**: o fallback para mock **nunca** escreve no
  `tinyCache` (`tinyCache.set()` só é chamado no caminho de sucesso,
  antes do `try/catch` das falhas) — então uma falha temporária não
  "envenena" o cache com dado incorreto nem faz a próxima requisição
  reutilizar um resultado de fallback como se fosse da Tiny.
- **Observabilidade interna** (novo, ver Fase 2): `status.ts` registra
  fonte ativa, horário do último sucesso, e status de fallback — nunca
  exposto ao cliente.

## Fase 6 — Validação de interface com dados reais da Tiny: ❌ NÃO executada

Depende da Fase 3. O que **foi** revalidado (não é a mesma coisa, mas é o
que era possível sem conta real): com `DATA_SOURCE=tiny` e **sem**
credenciais, o app continua respondendo normalmente (fallback de
configuração para mock, sem quebrar nenhuma rota) — mesmo comportamento
já confirmado na Sprint 4, testado novamente aqui. Layout, Design System,
tipografia, textos comerciais, fluxo de compra e navegação **não foram
alterados**.

## Fase 7 — Testes e entrega

| Verificação | Resultado |
|---|---|
| `npm run test` | ✅ 31/31 (8 novos testes desta sprint) |
| `npm run build` | ✅ compila, 18 páginas + 2 Route Handlers |
| `npm run lint` | ✅ 0 warnings, 0 erros |
| Rotas (`/`, `/busca`, `/carrinho`, `/produto/[slug]`, 404, `/api/products`, `/api/categories`) | ✅ todas OK |
| Busca por credenciais hardcoded | ✅ nenhuma encontrada (Fase 1) |
| Busca por imports diretos indevidos | ✅ nenhum encontrado (Fase 1) |
| Verificação de TypeScript | ✅ incluída no `next build` (checagem de tipos) |

## Resumo de arquivos

**Criados**: `docs/ARCHITECTURE_REVIEW_SPRINT_5.md`,
`docs/SPRINT_5_REPORT.md`, `src/lib/repositories/tiny/status.ts`.

**Alterados**: `src/lib/env.ts` (validação centralizada),
`src/lib/repositories/index.ts` (usa a nova validação),
`src/lib/repositories/tiny/tiny-product-repository.ts` e
`tiny-category-repository.ts` (integração com o status tracker),
`src/lib/repositories/tiny/tiny-client.test.ts` (+8 testes),
`src/lib/repositories/tiny/tiny-product-repository.test.ts` (+1 teste),
`src/lib/repositories/tiny/tiny-mapper.test.ts` (+1 teste de
acentuação), `docs/API_TINY.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`.

## Riscos e limitações que continuam abertos

- **Nunca testado contra uma conta real** — o maior risco remanescente.
  Todo o mapeamento em [API_TINY.md](./API_TINY.md) é fiel ao schema
  oficial documentado, mas contas reais podem ter peculiaridades de
  dados (campos preenchidos de forma inconsistente, categorias
  organizadas de um jeito inesperado) que só aparecem em uso real.
- Risco de N+1 na sincronização (documentado desde a Sprint 4, ainda não
  resolvido) — continua sem solução de banco local.
- `refresh_token` expira em 24h — ainda sem monitoramento automático.

## Recomendação

**NO-GO para produção.** Antes de ativar `DATA_SOURCE=tiny` em qualquer
ambiente real:
1. Configurar credenciais reais em `.env` local (nunca versionado),
   seguindo os passos da Fase 2 acima.
2. Executar a Fase 3 (homologação read-only real) e a Fase 6 (validação
   de interface com dados reais) numa sprint seguinte, com uma conta
   Tiny de verdade disponível.
3. Só então reavaliar esta recomendação.
