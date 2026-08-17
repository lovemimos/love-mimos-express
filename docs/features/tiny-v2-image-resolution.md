# Resolução de Imagens — Tiny v2 (investigação e correção)

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-v2-product-mapping.md](./tiny-v2-product-mapping.md) e
> [API_TINY.md](../API_TINY.md)

## O problema relatado

O produto `744931523` foi gravado com sucesso, mas sem fotos — o
campo de imagens veio como "nenhuma" no preview.

## Investigação

**Não tenho acesso ao JSON real deste produto** (sem token neste
ambiente) — a investigação foi estrutural: revisão do código do
mapeador e da documentação já existente do projeto.

### O que a documentação já existente revelou

`docs/API_TINY.md` (Sprint 4/5) já documentava um endpoint real e
confirmado, nunca usado até agora: **`GET /produtos/{idProduto}/anexos`**
— "Obter anexos e imagens do produto" (API v3), com resposta confirmada
no formato `{ id, url, externo }` **plano** (não aninhado).

O mapeador v2 (`tiny-v2-mapper.ts`) assumia uma estrutura **aninhada**
(`anexos[].anexo.url`) — uma suposição, nunca confirmada contra um
payload real. Dado que a v3 confirma um formato plano, é bem provável
que a v2 use algo parecido ou mais simples — o mapeador agora tenta as
duas formas.

## O que foi implementado

### 1. Scanner amplo (`tiny-v2-image-scanner.ts`)

Varre o payload inteiro (recursivamente) procurando qualquer coisa que
pareça imagem — por nome de chave (`imagem`, `anexo`, `attachment`,
`thumbnail`, `midia`, `foto`...) e por formato de valor (URL terminando
em `.jpg`/`.png`/`.webp`/etc.). Não depende de nenhum caminho fixo.

### 2. Chamada complementar real (`getProductAttachments` no `TinyIntegrationService`)

Implementa o endpoint confirmado `GET /produtos/{id}/anexos` — só é
tentado se as **credenciais v3** também estiverem configuradas
(independentes do `TINY_API_TOKEN` da v2).

### 3. Validação de acessibilidade real (`tiny-v2-image-validator.ts`)

Faz uma requisição HTTP real, sem nenhuma credencial, para cada URL
encontrada — confirma (ou não) que é pública e acessível sem login.

### 4. Orquestração (`tiny-v2-image-resolution.ts`)

Junta tudo, nesta ordem: (1) caminho direto do mapeador v2, (2)
varredura ampla, (3) chamada complementar v3 (se houver credenciais),
(4) validação de acessibilidade. Devolve sempre a **fonte** (`v2-direto`,
`v2-varredura`, `v3-complementar`, ou `nenhuma-fonte`), nunca inventa
uma imagem.

### 5. Primeira imagem = principal

A ordem do array `images[]` já determina a imagem principal.

## Bug real encontrado e corrigido no processo

Ao implementar o fallback do scanner, o mapeador empurrava **duas**
entradas de status para o mesmo campo `images` — quebrando a garantia
de "um status por campo". Corrigido.

## Testes

- `tiny-v2-image-scanner.test.ts` (10)
- `tiny-v2-image-resolution.test.ts` (6)
- `tiny-integration-service.test.ts`: +2 para `getProductAttachments`
- `tiny-v2-mapper.test.ts`: expandidos para os dois formatos de `anexos`

## Onde ver isso na prática

`/dev/tiny-v2-product-mapping` tem uma seção "Resolução completa de
imagens" mostrando a fonte, cada URL, e acessibilidade sem login.
`/dev/tiny-v2-product-validation` usa a mesma resolução.

## Comando para atualizar somente este produto

```bash
npm run write:tiny-v2-product -- 744931523          # preview
npm run write:tiny-v2-product -- 744931523 --apply   # grava, com confirmação interativa
```

## O que ainda depende de você

Rode `npm run dev` e abra `/dev/tiny-v2-product-mapping` para ver qual
das quatro fontes encontrou (ou não) a imagem real deste produto.
