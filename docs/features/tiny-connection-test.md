# Teste de Conexão — Tiny API v2 (temporário)

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-single-product-sync.md](./tiny-single-product-sync.md) (a
> integração real, v3/OAuth2 — este documento é sobre um teste
> isolado, à parte)

## Por que existe um segundo caminho de integração

`TINY_API_TOKEN` (token único e estático) é da **API v2** da Tiny —
diferente da **API v3** (`TINY_CLIENT_ID`/`TINY_CLIENT_SECRET`/
`TINY_REFRESH_TOKEN`, OAuth2) que o resto da integração
(`tiny-client.ts`, `TinyIntegrationService`) já usa. São duas APIs
genuinamente diferentes — URL base, mecanismo de autenticação e
formato de resposta diferentes. Esta rota testa especificamente a v2,
isolada de tudo mais, sem misturar os dois mecanismos.

## Como usar

1. Confirme que `TINY_API_TOKEN` está em `.env.local`.
2. `npm run dev`.
3. Abra uma das duas rotas equivalentes:
   - **Página (HTML)**: http://localhost:3000/dev/tiny-connection-test
   - **API (JSON)**: http://localhost:3000/api/tiny/test-product

Ambas rodam exatamente a mesma lógica (`testTinyV2Connection`) — a
página é mais fácil de ler no navegador; a rota de API é útil para
scripts/curl ou para quem espera um endpoint REST convencional.

## O que indica sucesso

A página mostra um banner verde **"✅ Conexão validada com sucesso"**
seguido do JSON completo do produto `744931523`, exatamente como a
Tiny devolveu (sem nenhum mapeamento aplicado). Se aparecer qualquer
banner vermelho/amarelo, a mensagem explica exatamente qual dos 5
casos aconteceu: token não carregado, falha de rede, erro de
autenticação, erro de permissão, ou produto não encontrado.

## Segurança

- **Server Component** (sem `"use client"`) — a chamada à Tiny
  acontece inteiramente no servidor; o token nunca é enviado ao
  navegador.
- O token vai só no **corpo** da requisição (`form-urlencoded`), nunca
  na URL/query string — evita que apareça em logs de proxy/CDN.
- Nenhum `console.log`/mensagem de erro em todo o fluxo inclui o valor
  do token — testado explicitamente
  (`tiny-v2-connection-test.test.ts`).
- **404 real em produção** (`notFound()`, `NODE_ENV === "production"`)
  — confirmado com build de produção real, não só em desenvolvimento.
- Rota **temporária**: existe só para validar a conexão manualmente,
  não faz parte da integração oficial (`TinyIntegrationService`, v3) e
  não sincroniza nem altera nada no catálogo ou na Tiny.

## Arquivos

| Arquivo | O que é |
|---|---|
| `src/lib/repositories/tiny/tiny-v2-connection-test.ts` | Lógica pura — chama a API v2, classifica o resultado. Sem JSX, sem Next.js. |
| `src/app/dev/tiny-connection-test/page.tsx` | Página dev-only que chama a função acima e renderiza o resultado. |
| `src/app/api/tiny/test-product/route.ts` | Rota de API dev-only equivalente, resposta em JSON. |
| `src/lib/repositories/tiny/tiny-v2-connection-test.test.ts` | 11 testes — token ausente/vazio, falha de rede, cada tipo de erro, sucesso, token nunca vaza. |
| `.env.example` | `TINY_API_TOKEN` documentado, deixando claro que é diferente das credenciais v3. |

## O que este teste NÃO faz

Não sincroniza o catálogo inteiro, não mapeia o produto para o domínio
(`Product`), não altera nada na Tiny, não substitui a integração v3
já existente. É só a confirmação de que a conexão funciona.
