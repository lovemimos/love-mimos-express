# Correção: `.env.local` não era carregado automaticamente pelo `tsx`

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-v2-write-audit.md](./tiny-v2-write-audit.md)

## Causa raiz — identificada pelo usuário, confirmada com teste real

`next dev`/`next build`/`next start` carregam `.env.local`
automaticamente por dentro, via `@next/env`. Um script rodado com
`tsx` puro **não tem esse comportamento** — só enxerga uma variável
de ambiente se ela já estiver no processo do shell. Por isso, definir
`$env:TINY_API_TOKEN` manualmente no PowerShell funcionava até fechar
aquela sessão; numa sessão nova, a variável simplesmente não existia
mais, e o comando falhava com `missing-token`.

## Correção

```ts
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });
```

No topo de `scripts/sync-tiny-v2-product.ts`, antes de qualquer outro
código rodar. `log` silencioso de propósito — nunca imprime nada, nem
o caminho do `.env.local`, muito menos o token.

## Testado, não presumido

1. `.env.local` com um token de teste, nenhuma variável exportada
   manualmente no shell → o comando parou de dar `missing-token` e
   passou a tentar a chamada de rede de verdade (`api-error`, porque
   o token de teste não é válido — esperado).
2. `.env.local` com o token vazio → voltou a dar `missing-token`
   corretamente.
3. Simulação completa de ponta a ponta (rede substituída
   temporariamente): com `.env.local` como única fonte do token,
   `npm run write:tiny-v2-product -- 744931523 --apply --force`
   rodou do início ao fim — `AÇÃO: UPDATE` no SKU `1168839597`,
   `IMAGENS ANTES: []` → `IMAGENS DEPOIS:` as 4 URLs, confirmado
   relendo o arquivo via subprocesso separado.

Todos os arquivos alterados durante os testes foram restaurados e
confirmados byte a byte idênticos ao original.

## Escopo respeitado

Só `scripts/sync-tiny-v2-product.ts` foi alterado — mapper, builder,
serializer e o componente de galeria não foram tocados.

## Comando (sem mudança na forma de usar)

```bash
npm run write:tiny-v2-product -- 744931523 --apply --force
```

Agora funciona em qualquer sessão nova de terminal, desde que
`TINY_API_TOKEN` esteja em `.env.local` na raiz do projeto.
