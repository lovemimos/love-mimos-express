# Love Mimos Express — Visão do Projeto

> Índice da documentação: [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md) ·
> [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) · [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) ·
> [ARCHITECTURE.md](./ARCHITECTURE.md) ·
> [NON_FUNCTIONAL_REQUIREMENTS.md](./NON_FUNCTIONAL_REQUIREMENTS.md) ·
> [features/](./features/README.md) ·
> [ROADMAP.md](./ROADMAP.md) · [API_TINY.md](./API_TINY.md) ·
> [AI_ASSISTANT.md](./AI_ASSISTANT.md) · [ADMIN_PANEL.md](./ADMIN_PANEL.md) ·
> [DELIVERY.md](./DELIVERY.md) · [SPRINT_4_REPORT.md](./SPRINT_4_REPORT.md) ·
> [ARCHITECTURE_REVIEW_SPRINT_5.md](./ARCHITECTURE_REVIEW_SPRINT_5.md) ·
> [SPRINT_5_REPORT.md](./SPRINT_5_REPORT.md) ·
> [SPRINT_5A_REPORT.md](./SPRINT_5A_REPORT.md) ·
> [SPRINT_6_REPORT.md](./SPRINT_6_REPORT.md) ·
> [SPRINT_7_REPORT.md](./SPRINT_7_REPORT.md) ·
> [SPRINT_8_REPORT.md](./SPRINT_8_REPORT.md) ·
> [SPRINT_9_REPORT.md](./SPRINT_9_REPORT.md) ·
> [SPRINT_10_REPORT.md](./SPRINT_10_REPORT.md) ·
> [MVP_CHECKLIST.md](./MVP_CHECKLIST.md) · [SPRINT_11_REPORT.md](./SPRINT_11_REPORT.md) ·
> [GO_LIVE_REPORT.md](./GO_LIVE_REPORT.md) ·
> [PRODUCT_CATALOG_GUIDE.md](./PRODUCT_CATALOG_GUIDE.md) · [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) ·
> [SPRINT_13_REPORT.md](./SPRINT_13_REPORT.md) ·
> [CHANGELOG.md](./CHANGELOG.md)

## 1. O que é

Love Mimos Express é uma mini loja mobile-first para uma marca de produtos
para **Lash Designers** (profissionais de extensão de cílios). Ela não
compete para ser um e-commerce completo — o objetivo é ser o catálogo mais
rápido possível entre a cliente ver um produto e mandar mensagem no
WhatsApp para fechar a compra. Todo o checkout, pagamento e combinação de
frete acontece na conversa, não dentro do app.

**Não é**: uma loja com carrinho persistente entre dispositivos, login,
histórico de pedidos, pagamento online ou rastreio. Se algum desses vira
necessidade real, é uma decisão consciente de expandir o escopo — não algo
que falta hoje. (Ver [ROADMAP.md](./ROADMAP.md) para o que está planejado
vs. fora de escopo.)

## 2. Por quê existe

Lash designers compram insumos (cílios, colas, pinças, kits) recorrentemente,
em pedidos pequenos e frequentes, quase sempre pelo WhatsApp direto com a
fornecedora. O app substitui o "manda um zap perguntando o preço" por um
catálogo visual com preço, estoque e variação já claros — a cliente monta o
pedido sozinha e só usa o WhatsApp para confirmar, o que reduz o
vai-e-volta de mensagens para a marca.

## 3. Identidade de marca, resumida

Paleta plum/rose/gold, tipografia Fraunces + Plus Jakarta Sans, e um motivo
visual autoral (curva de cílio) em vez de uma linha genérica sob o logo.
Referência de UX: Shopee (grid, badges, bottom nav), mas com identidade
própria para não parecer template. Detalhes completos, tokens e regras de
uso em [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## 4. Arquitetura de dados, resumida

Toda a UI depende só do contrato em `src/types/index.ts` (`Product`, `Category`,
`CartLine`). O catálogo hoje é mock (`src/lib/data/products.ts`); o plano de
integração com a Tiny ERP — sem precisar reescrever nenhuma tela — está
detalhado em [API_TINY.md](./API_TINY.md).

## 5. Decisões técnicas e por quê

- **Next.js App Router + Server/Client Components separados**: páginas de
  produto/categoria são Server Components (dados estáticos hoje, prontos
  para `fetch` assíncrono amanhã); interatividade (carrinho, variação,
  busca) fica isolada em Client Components (`"use client"`).
- **Fontes via `<link>` no `<head>`, não `next/font/google`**: escolha
  deliberada. `next/font/google` é o método recomendado pelo Next.js e
  self-hospeda a fonte automaticamente — mas exige acesso à internet
  **durante o build**. No ambiente onde este projeto foi desenvolvido e
  validado, o acesso a `fonts.googleapis.com` era bloqueado, então o build
  quebrava. Com `<link>`, a fonte carrega em runtime no navegador da
  cliente (que tem internet normal), e o build nunca depende de rede
  externa. Se o ambiente de deploy tiver acesso liberado à internet,
  migrar para `next/font/google` é uma melhoria de performance válida
  (evita FOUC, self-hosting).
- **Zustand em vez de Context API**: menos boilerplate para um estado
  simples (linhas do carrinho), com persistência em localStorage já
  embutida via middleware `persist`.
- **Sem fotos reais dos produtos ainda**: `ProductImagePlaceholder` gera
  uma arte-placeholder em degradê com o motivo do cílio, no mesmo formato
  que uma `<Image>` real ocupará — a troca por fotos é direta, sem mexer em
  layout.

## 6. Inventário de telas (estado atual)

> Estrutura de pastas migrada para `src/` com arquitetura Feature-First —
> detalhes completos em [ENGINEERING_GUIDELINES.md](./ENGINEERING_GUIDELINES.md).

| Rota | Função |
|---|---|
| `/` | Home: hero, busca instantânea, categorias, grid de produtos |
| `/busca` | Busca dedicada (acessível pelo bottom nav) |
| `/produto/[slug]` | Detalhe do produto: galeria, variação, quantidade, "Adicionar ao carrinho" e "Comprar agora" (WhatsApp direto) |
| `/carrinho` | Lista de itens, barra de frete grátis, botão "Finalizar pedido no WhatsApp" |

## 7. Como usar esta documentação

Este arquivo é o ponto de entrada — "o quê" e "por quê" em alto nível. Cada
tópico específico tem seu próprio documento (design, roadmap, integração
Tiny, assistente de IA, painel admin, entrega, changelog). Antes de mudar
algo estrutural, vale checar se a decisão já foi tomada com um motivo
registrado — e atualizar o documento correspondente se o motivo deixar de
valer.
