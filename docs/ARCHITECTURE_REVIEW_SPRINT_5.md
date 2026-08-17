# Revisão de Arquitetura — Sprint 5

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md). Este documento
> registra a revisão de segurança/arquitetura feita **antes** de qualquer
> homologação contra uma conta Tiny real, com o comando exato usado em
> cada verificação e o resultado real obtido — não uma checklist
> preenchida de memória.

## Leitura prévia

`VISION.md`, `PROJECT_VISION.md`, `ROADMAP.md`, `DESIGN_SYSTEM.md`,
`NON_FUNCTIONAL_REQUIREMENTS.md`, `ENGINEERING_GUIDELINES.md`,
`docs/API_TINY.md`, `docs/SPRINT_4_REPORT.md`, `CHANGELOG.md`,
`.env.example` foram lidos antes de qualquer alteração. `CLAUDE.md` foi
procurado e **não existe** no projeto — seguimos sem ele, como em todas
as sprints anteriores.

## Resultado geral

**Nenhuma violação arquitetural ou de segurança encontrada.** Todas as
verificações abaixo passaram na primeira execução — não houve necessidade
de correção nesta sprint (Fase 1, item 4 do brief não se aplicou).

## Verificações executadas

### 1. Nenhum componente do frontend acessa a Tiny diretamente

```bash
grep -rln "repositories/tiny\|tiny-client\|TinyProductRepository\|TinyCategoryRepository" src --include="*.tsx"
```
**Resultado**: vazio. ✅ Nenhum arquivo `.tsx` (componente/tela) referencia
qualquer parte do código da Tiny.

### 2. Nenhuma tela importa mocks diretamente

```bash
grep -rn "from \"@/lib/data/products\"\|from \"@/lib/data/categories\"" src --include="*.ts" --include="*.tsx"
```
**Resultado**: 3 arquivos, todos esperados e documentados —
- `src/hooks/useProducts.ts` — exceção documentada de `initialData` (ver
  [ARCHITECTURE.md §5](./ARCHITECTURE.md#5-exceção-documentada-initialdata-em-srchooksuseproductsts)),
  não é uma "tela", é um hook, e o valor só evita flash de carregamento
  na primeira pintura — a leitura real continua vindo do Route Handler.
- `src/lib/repositories/mock/mock-product-repository.ts` e
  `mock-category-repository.ts` — exatamente onde o mock deveria ser
  importado (a própria implementação do repositório mock).

Nenhum arquivo `.tsx` (Home, Busca, Carrinho, Detalhe de Produto) importa
o mock. ✅

### 3. Nenhuma tela importa o `TinyProductRepository` diretamente

```bash
grep -rn "^import.*TinyProductRepository\|^import.*TinyCategoryRepository" src --include="*.ts" --include="*.tsx"
```
**Resultado**: só 2 lugares —
`src/lib/repositories/index.ts` (composition root, exatamente onde
deveria estar) e o próprio teste
`tiny-product-repository.test.ts`. ✅

### 4. Todas as leituras passam por `ProductRepository`/serviço

Confirmado pelas buscas 1-3 acima: o único ponto de contato entre UI e
dados é `src/hooks/useProducts.ts` → Route Handler
(`src/app/api/products`, `/categories`) → `catalogService` →
`ProductRepository`/`CategoryRepository` (interface) → Mock ou Tiny. Não
existe nenhum atalho que pule essa cadeia.

### 5. Credenciais/tokens nunca chegam ao navegador

```bash
grep -rn "NEXT_PUBLIC_" src *.ts *.js *.json .env.example
```
**Resultado**: a única ocorrência de `NEXT_PUBLIC_` no projeto é dentro
de um comentário em `.env.example` **avisando para nunca fazer isso**.
Nenhuma variável pública real existe. ✅

### 6. Uso de `process.env` sempre guardado por `server-only`

```bash
grep -rln "process\.env" src --include="*.ts" --include="*.tsx"
```
**Resultado**: 2 arquivos —
- `src/lib/env.ts` — importa `server-only` corretamente. ✅
- `src/lib/repositories/tiny/tiny-client.test.ts` — define
  `process.env.TINY_CLIENT_ID` etc. só para simular configuração dentro
  do teste (nunca vai para o bundle de produção, arquivo `.test.ts` é
  excluído do build do Next.js). Não é uma violação — é o uso esperado
  em um teste.

### 7. Nenhum token/segredo hardcoded

```bash
grep -rnE "(client_secret|access_token|refresh_token|api[_-]?key)\s*[:=]\s*['\"][a-zA-Z0-9_-]{10,}" src
```
**Resultado**: vazio. ✅

### 8. Nenhuma credencial real em arquivo versionado

```bash
grep -rn "TINY_CLIENT_SECRET=.\+\|TINY_REFRESH_TOKEN=.\+" . --include="*.env*"
```
**Resultado**: vazio — `.env.example` só tem nomes de variável, sem
valores. Não existe (e nunca existiu neste ambiente) um arquivo `.env`
real. ✅

### 9. `.gitignore` cobre `.env`

```bash
git check-ignore -v .env
```
**Resultado**: `.gitignore:4:.env	.env` — confirmado que `.env` está na
lista de ignorados. O repositório local não tem nenhum commit ainda
(`git status` → "No commits yet"), então não há histórico para
verificar retroativamente, mas a regra de ignore já está em vigor antes
de qualquer commit futuro.

### 10. Route Handlers nunca retornam detalhes sensíveis ao cliente

Revisão manual de `src/app/api/products/route.ts` e
`src/app/api/categories/route.ts`: em caso de erro, o `catch` loga o
erro completo só no servidor (`console.error`) e devolve ao cliente
apenas `{ error: "Não foi possível carregar o catálogo." }` — nunca o
objeto de erro, stack trace, ou qualquer campo da exceção original. ✅

### 11. Nenhum log imprime valor de token/segredo

Revisão manual de todas as chamadas `console.*` em
`src/lib/repositories/tiny/tiny-client.ts`: todas usam strings estáticas,
paths e status HTTP — nenhuma interpola `accessToken`, `client_secret`
ou `refresh_token`. ✅

## Conclusão da Fase 1

Arquitetura aprovada para prosseguir à Fase 2 sem nenhuma correção
necessária. A separação cliente/servidor introduzida na Sprint 4
(Route Handlers + `server-only`) se mostrou eficaz — nenhuma regressão
encontrada.
