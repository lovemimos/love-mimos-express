# Love Mimos Express

> 🧭 [VISION.md](./VISION.md) — manifesto de uma página: missão, para quem,
> princípios não-negociáveis.

> 📖 Documentação completa em [`docs/`](./docs/PROJECT_VISION.md) —
> comece por [PROJECT_VISION.md](./docs/PROJECT_VISION.md):
> - [ENGINEERING_GUIDELINES.md](./docs/ENGINEERING_GUIDELINES.md) — stack, arquitetura Feature-First, regras não-negociáveis
> - [DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) — cores, tipografia, componentes
> - [BRAND_GUIDELINES.md](./docs/BRAND_GUIDELINES.md) — logo, cores de marca, favicon, PWA, Open Graph
> - [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — camada de dados: repositórios, serviços, modelo de carrinho
> - [NON_FUNCTIONAL_REQUIREMENTS.md](./docs/NON_FUNCTIONAL_REQUIREMENTS.md) — performance, acessibilidade, segurança, escalabilidade
> - [features/](./docs/features/README.md) — um documento por feature (product, cart, checkout, home/busca)
> - [ROADMAP.md](./docs/ROADMAP.md) — fases e o que está fora de escopo
> - [API_TINY.md](./docs/API_TINY.md) — plano de integração com a Tiny ERP
> - [AI_ASSISTANT.md](./docs/AI_ASSISTANT.md) — proposta futura (não implementado)
> - [ADMIN_PANEL.md](./docs/ADMIN_PANEL.md) — proposta futura (não implementado)
> - [DELIVERY.md](./docs/DELIVERY.md) — o que foi verificado, deploy, checklist de lançamento
> - [SPRINT_4_REPORT.md](./docs/SPRINT_4_REPORT.md) — resultado da integração real com a Tiny
> - [ARCHITECTURE_REVIEW_SPRINT_5.md](./docs/ARCHITECTURE_REVIEW_SPRINT_5.md) — revisão de segurança/arquitetura
> - [SPRINT_5_REPORT.md](./docs/SPRINT_5_REPORT.md) — homologação (status: NO-GO, sem conta real disponível)
> - [SPRINT_5A_REPORT.md](./docs/SPRINT_5A_REPORT.md) — preparação para homologação real (validação, logs, retry)
> - [SPRINT_6_REPORT.md](./docs/SPRINT_6_REPORT.md) — busca e descoberta de produtos
> - [SPRINT_7_REPORT.md](./docs/SPRINT_7_REPORT.md) — infraestrutura de carrinho persistente
> - [SPRINT_8_REPORT.md](./docs/SPRINT_8_REPORT.md) — favoritos inteligentes
> - [SPRINT_9_REPORT.md](./docs/SPRINT_9_REPORT.md) — Home inteligente (seções modulares)
> - [SPRINT_10_REPORT.md](./docs/SPRINT_10_REPORT.md) — motor de recomendações
> - [MVP_CHECKLIST.md](./docs/MVP_CHECKLIST.md) — status de todos os fluxos
> - [SPRINT_11_REPORT.md](./docs/SPRINT_11_REPORT.md) — MVP utilizável
> - [GO_LIVE_REPORT.md](./docs/GO_LIVE_REPORT.md) — auditoria de produção (prontidão: 8/10)
> - [PRODUCT_CATALOG_GUIDE.md](./docs/PRODUCT_CATALOG_GUIDE.md) — guia de importação de produtos
> - [PRODUCTION_CHECKLIST.md](./docs/PRODUCTION_CHECKLIST.md) — checklist de entrada em produção
> - [SPRINT_13_REPORT.md](./docs/SPRINT_13_REPORT.md) — implantação do MVP
> - [CHANGELOG.md](./docs/CHANGELOG.md) — histórico de versões

Mini loja mobile-first para Lash Designers, pensada para ser aberta a partir de
um link no WhatsApp. Design premium/feminino inspirado em apps como Shopee,
com identidade própria (paleta plum/rose/gold e o motivo de "curva de cílio"
usado no logo e como arte dos produtos). Arquitetura Feature-First em `src/`,
com Next.js, TypeScript, Tailwind, componentes estilo shadcn/ui, Framer
Motion, Zustand e React Query.

## Rodando localmente

```bash
npm install
cp .env.example .env   # opcional — o padrão (DATA_SOURCE=mock) já funciona sem isso
npm run dev
```

Abra http://localhost:3000 — o layout já é restrito a `max-w-md` para simular
a experiência mobile mesmo no desktop.

```bash
npm run build   # build de produção
npm run lint    # eslint
npm run test    # vitest — testes da integração com a Tiny
```

## Estrutura

```
src/
  app/
    page.tsx              # Home: hero, categorias, busca instantânea, grid
    busca/page.tsx         # Busca dedicada (acessível pelo bottom nav)
    produto/[slug]/page.tsx# Página de produto (server) -> ProductDetail (client)
    carrinho/page.tsx      # Carrinho + botão "Finalizar pedido no WhatsApp"
    providers.tsx           # QueryClientProvider (React Query)
    api/
      products/route.ts     # Route Handler — ponte segura entre hooks client-side e o catálogo
      categories/route.ts    # idem, para categorias
  features/
    product/components/     # SearchBar, CategoryPills, ProductCard/Grid, ProductBadge, ProductDetail
    cart/                   # components/ (CartLineItem, FreeShippingBar, WhatsAppCheckoutButton)
                             # store/cart-store.ts (Zustand + localStorage)
                             # hooks/useCartLines.ts
  components/
    layout/                # Header, BackHeader, BottomNav, Logo
    ui/                     # Button (shadcn-style), Rating, QuantityStepper, CategoryIcon, placeholders
  services/
    whatsapp.ts              # Monta a mensagem e o link wa.me
    catalog-service.ts        # Camada de negócio do catálogo (server-only)
    cart-service.ts            # Lógica pura do carrinho (resolução de linhas, totais)
  hooks/
    useProducts.ts           # Hooks de catálogo via React Query — chamam as Route Handlers, nunca a Tiny direto
  lib/
    config.ts                # Número do WhatsApp, frete grátis, nome da loja
    env.ts                    # Config server-only: DATA_SOURCE, credenciais Tiny
    utils.ts                 # cn() — merge de classes Tailwind
    data/                    # Catálogo mock (products.ts, categories.ts)
    repositories/
      contracts.ts            # Interfaces ProductRepository/CategoryRepository
      index.ts                 # Composition root — escolhe Mock ou Tiny via DATA_SOURCE
      mock/                     # MockProductRepository/MockCategoryRepository
      tiny/                     # TinyProductRepository/TinyCategoryRepository + client/mapper/cache
  types/index.ts             # Contrato de dados (Product, Category, Cart...)
  utils/format.ts             # formatBRL
```

Detalhes de arquitetura e regras de código em
[docs/ENGINEERING_GUIDELINES.md](./docs/ENGINEERING_GUIDELINES.md) e
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Antes de publicar

1. Edite `src/lib/config.ts` e troque `whatsappNumber` pelo número real da
   loja (formato internacional, só dígitos: `55` + DDD + número).
2. Troque os placeholders de imagem (`ProductImagePlaceholder`) por fotos
   reais dos produtos — o componente já reserva o mesmo formato/arredondamento
   de um `<Image />` do Next, então a troca é direta.

## Integrando com a Tiny API

Implementado — ver [docs/API_TINY.md](./docs/API_TINY.md) (documentação
técnica completa, com riscos e limitações reais encontrados) e
[docs/SPRINT_4_REPORT.md](./docs/SPRINT_4_REPORT.md) (o que foi
entregue/testado).

**Para ativar**: preencher `TINY_CLIENT_ID`, `TINY_CLIENT_SECRET`,
`TINY_REFRESH_TOKEN` em `.env` (nunca commitar) e definir
`DATA_SOURCE=tiny`. Sem essas três variáveis, o app cai para o mock
automaticamente, mesmo com `DATA_SOURCE=tiny` — nunca quebra por
configuração incompleta.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (tokens de marca em `tailwind.config.js`)
- Componentes estilo shadcn/ui (`class-variance-authority` + Radix Slot)
- Framer Motion (animações com propósito — feedback de ação, stagger de lista)
- Zustand (carrinho, persistido em localStorage)
- React Query (camada de dados do catálogo no cliente)
- Vitest (testes da camada de integração com a Tiny)
- lucide-react (ícones)
