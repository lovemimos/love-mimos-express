# Correção: Página de Produto Servindo HTML Antigo (cache de build estático)

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-v2-single-product-write.md](./tiny-v2-single-product-write.md)

## O que foi pedido

Confirmar que o produto gravado é o mesmo persistido no disco (log
antes/depois, relendo o arquivo real) e, se o array persistido
estivesse correto mas a página continuasse sem imagem, investigar
exclusivamente o frontend.

## Causa raiz — confirmada com experimento real, não teoria

`/produto/[slug]/page.tsx` usa `generateStaticParams()` **sem nenhuma
configuração de revalidação**. O comportamento padrão do Next.js
nesse caso é: a página é gerada **uma única vez, no momento do
build**, e nunca mais atualiza sozinha.

Reproduzi isso de propósito, duas vezes:

1. **Produto novo**: `npm run build`, depois adicionei um produto ao
   catálogo sem rebuildar → `HTTP 404` na rota nova.
2. **Produto existente atualizado** (o cenário real de sincronizar um
   produto que já tinha slug no catálogo): `npm run build`, depois
   mudei o campo `images` de um produto já existente sem rebuildar →
   o servidor continuou servindo o HTML antigo, sem a URL nova em
   lugar nenhum da resposta.

Isso explica exatamente o sintoma relatado: gravar com sucesso, o
array persistido no arquivo estar correto, e a página continuar sem
imagem — a página servida não foi gerada a partir do arquivo atual,
foi gerada uma vez, antes.

## Correção

```ts
// src/app/produto/[slug]/page.tsx
export const revalidate = 60;
```

Transforma a rota em ISR (Incremental Static Regeneration): continua
estática (rápida) na maior parte do tempo, mas o Next.js revalida em
segundo plano depois de 60 segundos.

**Validado com o mesmo experimento**: com a correção aplicada, a mesma
mudança sem rebuild apareceu corretamente na resposta do servidor.

## Se você quiser ver a mudança na hora

`npm run build` de novo sempre resolve imediatamente — o `revalidate`
é uma rede de segurança para quando isso não é rodado manualmente.

## O log pedido (antes/depois, relido do disco)

`scripts/sync-tiny-v2-product.ts` agora imprime, antes de gravar (ID
Tiny, SKU, Nome, `images[]` completo, quantidade) e, depois de gravar,
relê o produto de um **subprocesso totalmente novo** (não do objeto em
memória, não de um `import()` com cache-busting — testado e confirmado
que isso não força uma releitura de verdade neste ambiente) e imprime
o mesmo snapshot, comparando se o array bate exatamente.

## Arquivos alterados

`src/app/produto/[slug]/page.tsx` (`revalidate = 60`),
`scripts/sync-tiny-v2-product.ts` (log antes/depois + releitura via
subprocesso).
