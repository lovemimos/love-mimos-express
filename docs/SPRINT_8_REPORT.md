# Relatório da Sprint 8 — Favoritos Inteligentes

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [docs/features/favorites.md](./features/favorites.md)

## Resumo executivo

Infraestrutura de favoritos construída reutilizando deliberadamente o
desenho do carrinho persistente (Sprint 7): Zustand global (sem
Provider), serviço puro separado do store, e — a decisão técnica mais
importante desta sprint — a lógica de recuperação de dados corrompidos
do `localStorage` foi **extraída** para
`src/lib/persist/safe-local-storage.ts` em vez de duplicada, e o
carrinho foi atualizado para usar essa mesma fábrica compartilhada.

**Leitura prévia**: `PROJECT_VISION.md`, `ROADMAP.md`, `DESIGN_SYSTEM.md`,
`ARCHITECTURE.md`, `ENGINEERING_GUIDELINES.md`, `CHANGELOG.md` — lidos
antes de qualquer alteração. `CLAUDE.md` não existe no projeto.

## Arquivos criados

`src/lib/persist/safe-local-storage.ts`,
`src/features/favorites/store/favorites-store.ts`,
`src/services/favorites-service.ts`,
`src/features/favorites/hooks/useFavoriteProducts.ts`,
`src/features/favorites/components/FavoriteButton.tsx`,
`src/app/favoritos/page.tsx`, 3 arquivos de teste,
`docs/features/favorites.md`, `docs/SPRINT_8_REPORT.md`.

## Arquivos alterados

`src/features/cart/store/cart-store.ts` (usa o storage compartilhado),
`src/components/layout/Header.tsx`, `src/features/product/components/ProductCard.tsx`,
`src/features/product/components/ProductDetail.tsx`, `src/types/index.ts`,
`docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`.

## Decisões técnicas

1. **Sem `FavoritesProvider` de Context** — mesma razão do carrinho
   (Sprint 7): Zustand já é global, um Provider seria boilerplate
   duplicado sem ganho.
2. **`createSafeLocalStorage` extraído, não duplicado** — o carrinho já
   tinha corrigido o bug de JSON corrompido; em vez de reescrever a
   mesma correção para favoritos, ela virou uma fábrica genérica
   reutilizada por ambos.
3. **Sem `variantId` em `FavoriteEntry`** — favoritar é por produto, não
   por variação (diferente do carrinho, onde a variação afeta preço).
4. **`addedAt` sem uso na UI hoje** — só ordena "Meus Favoritos" por
   recência; existe para permitir campanhas/recomendações por recência
   futuramente sem mudança de schema.
5. **Botão de favoritar no canto superior direito do card** — o único
   canto livre (badge/esgotado ocupam superior esquerdo, desconto o
   inferior direito).

## Testes

`safe-local-storage.test.ts` (6), `favorites-store.test.ts` (10 —
adição, sem duplicação, remoção, toggle, existência, limpeza,
persistência, recuperação, dados corrompidos), `favorites-service.test.ts`
(4). **Resultado: 131/131** (20 novos, mais 111 já existentes).

## Build e lint

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros |
| `npm run test` | ✅ 131/131 |
| `npm run build` | ✅ compila, 23 rotas |

## Riscos encontrados

Nenhum risco novo — a mesma classe de bug do carrinho (JSON corrompido)
já foi resolvida na fonte compartilhada antes de afetar os favoritos.

## Compatibilidade confirmada

Tiny (favoritos só guardam `productId`, resolvidos contra
`useProductQuery`, que já funciona com Mock ou Tiny), Lumi (API do store
já estável para um assistente futuro sugerir/ler favoritos), WhatsApp e
recomendações futuras (sem acoplamento de UI).
