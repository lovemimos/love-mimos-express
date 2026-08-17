# Correção: Renderização de Imagens Reais + Descrição HTML

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-v2-image-resolution.md](./tiny-v2-image-resolution.md)

## O problema relatado

O produto `744931523` foi gravado com 4 imagens reais (URLs
confirmadas acessíveis, HTTP 200), mas o site continuava mostrando o
placeholder da marca em vez das fotos.

## Causa raiz encontrada

**`ProductGallery`, `ProductCard` e `CartLineItem` sempre renderizavam
`ProductImagePlaceholder` incondicionalmente** — nunca checavam se
`product.images` tinha alguma URL real. Isso nunca tinha aparecido
como bug porque, até agora, todo produto do catálogo (mock e
Nuvemshop) tinha `images: []` ou ids de gradiente falsos — nunca uma
URL de verdade. O próprio código já documentava a intenção ("Swap the
`<div>` below for a real `<Image src={product.images[0]} .../>` once
photography is available") — só nunca tinha sido feito.

Confirmado também: **`next/image` não era usado em lugar nenhum do
projeto** antes desta correção.

## O que NÃO precisou de correção

- `next.config.js` **já** tinha `images.remotePatterns` configurado
  com `hostname: "**"` — qualquer domínio HTTPS (Tiny, S3, CloudFront,
  o que for) já era permitido. Nenhuma mudança necessária aqui.

## O que foi implementado

### 1. `ProductImage` (`src/components/ui/ProductImage.tsx`)

Componente único que decide: `images[index]` existe → `next/image`
real; senão → `ProductImagePlaceholder`. Usado por `ProductCard` e
`CartLineItem` (imagem principal) e por `ProductGallery` (com índice
variável).

### 2. `ProductGallery` reescrita

Os pontos da galeria agora trocam a foto de verdade quando há imagens
reais (antes eram decorativos — o próprio código já documentava isso
como uma interação morta). A primeira imagem é sempre a principal.

### 3. Descrição HTML sanitizada (`src/utils/sanitize-html-for-display.ts`)

Novo sanitizador por allowlist (`p`, `br`, `strong`, `b`, `em`, `i`,
`ul`, `ol`, `li`, `span`) — remove `<script>`/`<style>`/`<iframe>` e
todo o conteúdo dentro deles, remove todos os atributos de toda tag
(sem `onclick=`, sem `href="javascript:..."`), decodifica entidades.
Usado em duas camadas: no mapeador Tiny v2 (na origem) e de novo no
render (`ProductDetail.tsx`, defesa em profundidade, idempotente).
Descrições sem HTML nenhum continuam renderizando como texto simples
— `dangerouslySetInnerHTML` só é usado quando há HTML real para
sanitizar.

### 4. Bug relacionado corrigido: `shortDescription` truncava HTML no meio de uma tag

Ao revisar `tiny-v2-product-builder.ts`, encontrei que
`shortDescription` era derivada truncando a `description` (agora HTML
sanitizado) por contagem de caracteres — o que podia cortar uma tag
pela metade e produzir HTML quebrado. Corrigido: `shortDescription`
agora deriva do texto **sem tags**, já que é sempre renderizada como
texto puro (nunca via `dangerouslySetInnerHTML`).

## Testes

- `ProductImage.test.tsx` (4) — imagem real renderiza `<img>`, array
  vazio renderiza placeholder (sem `<img>`), primeira imagem é a
  principal por padrão, índice diferente mostra a foto certa.
- `ProductDetail.test.tsx`: +5 — produto com imagem externa real
  renderiza a foto (não o placeholder); produto sem imagem continua
  mostrando o placeholder; descrição com HTML renderiza formatação de
  verdade (não como texto bruto com `<>`); `<script>` na descrição é
  removido; descrição sem HTML nenhum continua funcionando como texto
  simples.
- `sanitize-html-for-display.test.ts` (13).

## Arquivos criados

| Arquivo | O que é |
|---|---|
| `src/components/ui/ProductImage.tsx` | Decide foto real vs. placeholder |
| `src/utils/sanitize-html-for-display.ts` | Sanitizador por allowlist para renderização segura |
| `src/components/ui/ProductImage.test.tsx` | 4 testes |

## Arquivos alterados

`ProductGallery.tsx` (reescrito, dots funcionais), `ProductCard.tsx`,
`CartLineItem.tsx`, `ProductDetail.tsx` (descrição sanitizada +
`productName` passado à galeria), `tiny-v2-mapper.ts` (sanitiza a
descrição na origem), `tiny-v2-product-builder.ts` (corrige o bug do
truncamento), `ProductDetail.test.tsx` (+5 testes).
