# Correção: Validação de URL de Imagem (valores legados "lash-1")

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [product-image-rendering-fix.md](./product-image-rendering-fix.md)

## O erro relatado

```
Failed to parse src "lash-1" on next/image. If using relative image
it must start with "/" or be an absolute URL.
```

## Causa raiz

A correção anterior (renderizar foto real via `next/image` quando
`images` não está vazio) não verificava se cada valor em `images[]`
era de fato uma URL/caminho válido — só se o array tinha algum item.

O catálogo carrega, desde os primeiros mocks (antes de qualquer
importação real), 3 produtos com valores como `"lash-1"`/`"lash-2"`/
`"lash-3"` — identificadores de gradiente do placeholder antigo, nunca
URLs de verdade. Isso nunca deu erro porque o placeholder antigo nem
lia esse valor. Assim que `next/image` passou a tentar renderizar
`images[0]` diretamente, esses 3 produtos quebravam.

## Correção

### `src/utils/normalize-image-url.ts` (novo)

Único ponto de decisão "isso é uma imagem de verdade": válido só se
começar com `http://`, `https://`, ou `/`. Qualquer outra coisa —
incluindo `"lash-1"` — é descartada.

`ProductImage` (e portanto `ProductCard`/`CartLineItem`/
`ProductGallery`) filtra por essa função antes de decidir foto real
vs. placeholder. `ProductGallery` também usa a mesma função para a
contagem de pontos, para não contar lixo legado como foto real.

### Camada de gravação também protegida

`scripts/lib/serialize-catalog.ts` agora normaliza `images` ao
escrever o catálogo — qualquer importação/gravação futura nunca
persiste um valor inválido.

### Catálogo atual limpo

Os 3 produtos mock que ainda tinham `images: ["lash-1","lash-1b"]` /
`["lash-2"]` / `["lash-3"]` foram corrigidos para `images: []`.

## Sobre o produto 744931523 especificamente

Não tenho acesso ao arquivo `products.ts` real da sua máquina — não
consigo editá-lo diretamente daqui. Com a normalização em duas camadas
(renderização E gravação), rodar o comando abaixo resolve nos dois
sentidos:

```bash
npm run write:tiny-v2-product -- 744931523 --apply --force
```

`--force` é necessário porque o produto já existe no seu catálogo.

## Testes

- `normalize-image-url.test.ts` (12) — URL absoluta válida, caminho
  local `/imagem.jpg` válido, `"lash-1"`/`"lash-2"`/`"lash-3"`
  inválidos, string vazia inválida, lista mista mantém só as válidas.
- `ProductImage.test.tsx`: +3 — caminho local aceito, `"lash-1"`
  nunca vira `<img>`, lista mista usa só a válida.

## Arquivos alterados

`ProductImage.tsx`, `ProductGallery.tsx`,
`scripts/lib/serialize-catalog.ts`, `src/lib/data/products.ts`.

## Arquivos criados

`src/utils/normalize-image-url.ts`, `normalize-image-url.test.ts`.
