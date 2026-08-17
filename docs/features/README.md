# Documentação por Feature

> Volta para [../PROJECT_VISION.md](../PROJECT_VISION.md)

Cada pasta em `src/features/` tem um documento espelho aqui, com o mesmo
nome. A regra é simples: **se existe uma pasta de feature no código, existe
um documento aqui** — e vice-versa. Isso mantém a arquitetura Feature-First
(ver [ENGINEERING_GUIDELINES.md](../ENGINEERING_GUIDELINES.md#3-arquitetura-feature-first))
navegável sem precisar abrir o código para entender o que cada domínio faz.

## Índice

| Documento | Pasta correspondente | Escopo |
|---|---|---|
| [product.md](./product.md) | `src/features/product/` | Catálogo, busca, categorias, detalhe do produto |
| [cart.md](./cart.md) | `src/features/cart/` | Estado do carrinho, linha de itens, frete grátis |
| [favorites.md](./favorites.md) | `src/features/favorites/` | Lista de produtos favoritados, persistida localmente |
| [checkout-whatsapp.md](./checkout-whatsapp.md) | cruza `cart/` e `product/` | O fluxo que sai do app e vira mensagem no WhatsApp |
| [home-and-search.md](./home-and-search.md) | `src/app/page.tsx`, `src/app/busca/page.tsx` | As duas telas de descoberta de produto (não são uma pasta de feature própria — compõem `product/`) |
| [home.md](./home.md) | `src/features/home/` | Decomposição da Home em seções independentes (Sprint 9) |
| [recommendations.md](./recommendations.md) | `src/features/recommendations/`, `src/services/recommendations/` | Motor de recomendações baseado em estratégias (Sprint 10) |
| [nuvemshop-import.md](./nuvemshop-import.md) | `src/lib/import/nuvemshop/`, `scripts/import-nuvemshop.ts` | Importação de catálogo a partir de export real da Nuvemshop |
| [faceted-catalog.md](./faceted-catalog.md) | `src/lib/facets/`, `Product.attributes`/`brandSlug` | Catálogo facetado — ver também [ARCHITECTURE_CATALOG.md](../ARCHITECTURE_CATALOG.md) |
| [tiny-single-product-sync.md](./tiny-single-product-sync.md) | `src/lib/repositories/tiny/single-product-sync.ts`, `scripts/sync-tiny-product.ts` | Integração real (v3/OAuth2): sincronização controlada de um produto |
| [tiny-connection-test.md](./tiny-connection-test.md) | `src/lib/repositories/tiny/tiny-v2-connection-test.ts`, `/dev/tiny-connection-test` | Teste temporário e isolado da API v2 (token estático) |
| [tiny-v2-product-mapping.md](./tiny-v2-product-mapping.md) | `src/lib/repositories/tiny/tiny-v2-mapper.ts`, `/dev/tiny-v2-product-mapping` | Mapeamento Tiny v2 → domínio (validação, temporário) |
| [tiny-v2-single-product-write.md](./tiny-v2-single-product-write.md) | `scripts/sync-tiny-v2-product.ts`, `/dev/tiny-v2-product-validation` | Gravação controlada de um único produto + validação do ciclo completo |
| [tiny-v2-image-resolution.md](./tiny-v2-image-resolution.md) | `src/lib/repositories/tiny/tiny-v2-image-*.ts` | Investigação e correção da resolução de imagens (scanner + chamada complementar v3 + validação de acessibilidade) |
| [product-image-rendering-fix.md](./product-image-rendering-fix.md) | `src/components/ui/ProductImage.tsx`, `ProductGallery.tsx`, `sanitize-html-for-display.ts` | Correção: frontend não renderizava fotos reais, sempre mostrava placeholder; descrição HTML agora sanitizada e formatada |
| [image-url-validation-fix.md](./image-url-validation-fix.md) | `src/utils/normalize-image-url.ts` | Correção: valores legados de placeholder (`lash-1`) quebravam `next/image` |
| [product-page-stale-cache-fix.md](./product-page-stale-cache-fix.md) | `src/app/produto/[slug]/page.tsx` | Correção: página de produto sem `revalidate` servia HTML antigo após gravação — confirmado com experimento real |
| [tiny-v2-write-audit.md](./tiny-v2-write-audit.md) | `scripts/sync-tiny-v2-product.ts` | Auditoria completa da gravação (create/update, critério de correspondência, mensagens explícitas) — validada com simulação real de ponta a ponta |
| [tiny-script-env-loading-fix.md](./tiny-script-env-loading-fix.md) | `scripts/sync-tiny-v2-product.ts` | Correção: `.env.local` não era carregado automaticamente pelo `tsx`, causando `missing-token` intermitente em sessões novas |
| [tiny-script-windows-subprocess-fix.md](./tiny-script-windows-subprocess-fix.md) | `scripts/sync-tiny-v2-product.ts` | Correção: `spawnSync npx ENOENT` no Windows — subprocesso eliminado, releitura via leitura de texto puro |
| [tiny-v2-price-stock-mapping-fix.md](./tiny-v2-price-stock-mapping-fix.md) | `src/lib/repositories/tiny/tiny-v2-mapper.ts` | Correção: preço R$ 0,00 e estoque esgotado — mapeamento agora aceita `preco`/`estoque` em formato aninhado |
| [tiny-v2-multi-deposit-stock-fix.md](./tiny-v2-multi-deposit-stock-fix.md) | `tiny-v2-mapper.ts`, `scripts/compare-tiny-products.ts` | Correção: estoque vazio em um produto específico (múltiplos depósitos) + ferramenta de comparação lado a lado |

## Convenção de cada documento

Todo documento de feature segue a mesma estrutura, para ser fácil de
escanear:

1. **O que é** — o que essa feature resolve para quem compra
2. **Arquivos** — onde a lógica vive, com um parágrafo de responsabilidade
   de cada arquivo relevante (não uma lista genérica de imports)
3. **Fluxo de dados** — de onde o dado vem, o que transforma, onde termina
4. **Decisões e por quê** — escolhas específicas dessa feature que não
   estão no [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) geral
5. **Casos de borda tratados** — o que já foi pensado (estoque zerado,
   carrinho vazio, slug inválido, etc.)
6. **O que essa feature não faz (ainda)** — link para
   [ROADMAP.md](../ROADMAP.md) quando aplicável

## Quando criar um novo documento aqui

Ao criar uma nova pasta em `src/features/`, criar o documento
correspondente no mesmo commit/PR — não depois. Uma feature sem documento
é tratada como incompleta, na mesma linha da regra de
[ENGINEERING_GUIDELINES.md §9](../ENGINEERING_GUIDELINES.md#9-documentação-obrigatória).
