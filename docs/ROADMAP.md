# Roadmap — Love Mimos Express

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md)

## Fase 0 — Fundação (concluída)

- [x] Estrutura Next.js 14 (App Router) + TypeScript + Tailwind
- [x] Design system aplicado (ver [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md))
- [x] Catálogo mock com 12 produtos reais de lash design, 6 categorias
- [x] Carrinho com Zustand + persistência em localStorage
- [x] Fluxo completo: Home → Produto → Carrinho → WhatsApp
- [x] Build, lint e smoke test de todas as rotas validados
  (ver [CHANGELOG.md](./CHANGELOG.md))

## Fase 1 — Pré-lançamento

- [ ] Trocar `whatsappNumber` em `src/lib/config.ts` pelo número real da loja
- [ ] Fotos reais dos 12 produtos (substituir
  `components/ui/ProductImagePlaceholder.tsx` pelo `<Image>` real)
- [ ] Revisar textos de descrição/variações com o time de produto
  (os textos atuais são placeholders realistas, não copy final aprovado)
- [ ] Definir domínio/hospedagem e configurar deploy (Vercel é o caminho
  mais direto para um projeto Next.js sem infra própria)

## Fase 2 — Integração com Tiny ERP

Detalhes técnicos completos em [API_TINY.md](./API_TINY.md). Arquitetura
de suporte pronta desde a Sprint 3 — ver [ARCHITECTURE.md](./ARCHITECTURE.md).
Implementação real entregue na Sprint 4 — ver
[SPRINT_4_REPORT.md](./SPRINT_4_REPORT.md). `DATA_SOURCE=mock` continua
sendo o padrão; Tiny é opt-in.

- [x] Camada de repositório/serviço desacoplada da UI (Sprint 3)
- [x] Client de autenticação (OAuth2, renovação automática de token) —
  `src/lib/repositories/tiny/tiny-client.ts` (Sprint 4)
- [x] `TinyProductRepository`/`TinyCategoryRepository` implementando os
  contratos em `src/lib/repositories/contracts.ts` (Sprint 4)
- [x] Estoque em tempo real — vem de `estoque.quantidade` no detalhe do
  produto (Sprint 4); consulta por depósito (`/estoque/{id}`) não usada
  ainda, ver [API_TINY.md §3](./API_TINY.md#3-base-da-api-e-endpoints-usados)
- [x] Preço e promoção sincronizados via `precos.preco`/`precos.precoPromocional`
  (Sprint 4)
- [ ] Sincronização em banco local para catálogos grandes — a listagem
  da Tiny não traz categoria/imagens/variações (só o detalhe traz),
  então montar o catálogo hoje é um padrão N+1 que não escala bem além
  de catálogos pequenos/médios — ver
  [API_TINY.md §4](./API_TINY.md#4-limitação-crítica-encontrada-listagem--detalhe)
  e §11 (riscos)
- [ ] Estados de carregamento reais (skeleton/spinner) caso a latência da
  Tiny se mostre perceptível em uso — hoje o `initialData` do mock cobre
  a primeira pintura da tela, ver
  [ARCHITECTURE.md §5](./ARCHITECTURE.md#5-exceção-documentada-initialdata-em-srchooksuseproductsts)
- [ ] Cache compartilhado entre instâncias (hoje é em memória, por
  processo) — só relevante para deploy multi-instância
- [ ] **Homologação contra conta Tiny real** — Sprint 5 revisou
  arquitetura, segurança e resiliência (tudo aprovado), mas não teve
  acesso a credenciais reais. Recomendação atual: **NO-GO** para
  `DATA_SOURCE=tiny` em produção até essa homologação acontecer — ver
  [SPRINT_5_REPORT.md](./SPRINT_5_REPORT.md)

## Fase 2A — Busca e Descoberta de Produtos (concluída — Sprint 6)

Implementado independente da integração real com a Tiny (que segue
aguardando confirmação do suporte da Olist/Tiny) — tudo roda igualmente
sobre `MockProductRepository` e `TinyProductRepository`, sem acoplamento
a parâmetros específicos da Tiny. Ver
[SPRINT_6_REPORT.md](./SPRINT_6_REPORT.md) e
[docs/features/home-and-search.md](./features/home-and-search.md).

- [x] Contrato de consulta ampliado (`ProductRepository.query()`):
  busca, categoria, ordenação, paginação, disponibilidade, destaque
- [x] Busca tolerante a acento/caixa/espaço, com correspondência parcial
  e múltiplas palavras
- [x] Filtro de categoria combinável com busca textual
- [x] Ordenação (relevância/menor preço/maior preço/nome A-Z)
- [x] Paginação via "carregar mais"
- [x] `/busca` com estado na URL (`q`, `categoria`, `ordem`) — shareável
  e resistente a atualizar a página
- [x] Estados de carregando/erro/vazio (com ação) na interface
- [ ] Sugestões de busca/autocomplete — não solicitado ainda
- [ ] Histórico de buscas recentes — não solicitado ainda
- [ ] Número de página refletido na URL — escolha consciente de manter
  fora (ver [SPRINT_6_REPORT.md](./SPRINT_6_REPORT.md))

## Fase 2B — Infraestrutura de Carrinho Persistente (concluída — Sprint 7)

Não era um checkout novo — era reforçar a base de carrinho já existente
desde a Fase 0 para suportar o crescimento da plataforma (favoritos,
Lumi, WhatsApp mais rico, Tiny) sem precisar refazer nada depois. Ver
[SPRINT_7_REPORT.md](./SPRINT_7_REPORT.md) e
[docs/features/cart.md](./features/cart.md).

- [x] `hasItem()` — consulta de existência de produto/variação no
  carrinho, faltava desde a Fase 0
- [x] **Bug real corrigido**: `persist` do Zustand não capturava JSON
  corrompido em `localStorage` — inicialização do store podia lançar
  exceção não tratada. Agora recupera graciosamente (carrinho vazio +
  aviso no log), testado explicitamente
- [x] Botões "Continuar comprando" e "Limpar carrinho" na página do
  carrinho (antes só existia "Ver produtos" no estado vazio)
- [x] Estado morto (`isOpen`/`openCart`/`closeCart`, nunca consumido)
  removido do store
- [x] Cobertura de testes para `cart-store.ts` e `cart-service.ts` —
  antes desta sprint, **nenhum teste existia** para o carrinho
- [x] Seletores escopados (`useCartCount`, `useIsInCart`) confirmados
  como já suficientes para performance — nenhuma re-renderização
  desnecessária encontrada

## Fase 2C — Favoritos Inteligentes (concluída — Sprint 8)

Mesmo padrão arquitetural do carrinho (Zustand + storage seguro
compartilhado + serviço puro). Ver
[SPRINT_8_REPORT.md](./SPRINT_8_REPORT.md) e
[docs/features/favorites.md](./features/favorites.md).

- [x] `useFavoritesStore` (add/remove/toggle/clear/isFavorite),
  persistido com recuperação automática de dados corrompidos
- [x] `resolveFavoriteProducts` — serviço puro, descarta produto
  removido do catálogo sem quebrar
- [x] Botão de favoritar no `ProductCard` e `ProductDetail`
- [x] Página "Meus Favoritos" (`/favoritos`) com estado vazio
- [x] Badge de contagem no `Header`, ao lado do carrinho
- [x] `createSafeLocalStorage` extraído do carrinho para uso
  compartilhado — sem duplicar a correção de dados corrompidos

## Fase 2D — Home Inteligente (concluída — Sprint 9)

Home decomposta em seções independentes, sem nenhuma IA implementada —
só a infraestrutura visual/arquitetural que a Lumi usará depois. Ver
[SPRINT_9_REPORT.md](./SPRINT_9_REPORT.md) e
[docs/features/home.md](./features/home.md).

- [x] `HomeSection`/`HomeSectionTitle`/`HomeCarousel` — política de
  carregando/erro/vazio/não-renderização centralizada
- [x] `HomeHero` preparado para múltiplos banners (`HeroBanner`)
- [x] Continue Comprando, Seus Favoritos — não renderizam quando vazios
- [x] Mais Vendidos, Novidades — via `ProductQuery.badge`, sem acoplar
  a mocks, compatível com Tiny
- [x] Categorias em Destaque — vitrine visual com CTA para `/busca`
- [x] `src/lib/analytics.ts` — estrutura de eventos, sem integração real
- [x] `src/services/recommendation-service.ts` — interfaces +
  estratégia trivial (não-IA), pronta para a Lumi
- [x] Lazy loading das seções secundárias via `next/dynamic`
- [x] Seção de recomendações visível — conectada na Sprint 10 (ver
  [Fase 2E](#fase-2e--recommendation-engine-concluída--sprint-10))
- [ ] Analytics real (provedor conectado) — estrutura pronta, sem
  integração
- [ ] Administração real de banners — hoje mock, ver
  [ADMIN_PANEL.md](./ADMIN_PANEL.md)

## Fase 2E — Recommendation Engine (concluída — Sprint 10)

Motor de recomendações baseado em regras, sem IA, preparado para a
Lumi substituir qualquer estratégia sem mudança em outro arquivo. Ver
[SPRINT_10_REPORT.md](./SPRINT_10_REPORT.md) e
[docs/features/recommendations.md](./features/recommendations.md).

- [x] `RecommendationEngine` (registro + execução por nome) e
  `RecommendationProvider` (seleção automática por prioridade)
- [x] 6 estratégias: `RelatedProductsStrategy`, `CompleteKitStrategy`,
  `BestSellerStrategy`, `NewestProductsStrategy`, `FavoriteBasedStrategy`,
  `CartBasedStrategy`
- [x] `RecommendationSection`/`RecommendationCarousel` — reaproveitando
  `HomeSection`/`HomeCarousel`/`ProductCard`, sem duplicação
- [x] Conectado em Home, Produto e Carrinho — puramente aditivo, sem
  tocar em Carrinho/Favoritos
- [x] `recommendation_view`/`recommendation_click` disparando de
  verdade; `recommendation_add_to_cart`/`recommendation_favorite`
  definidos como estrutura (não disparados — exigiriam tocar em
  Carrinho/Favoritos)
- [ ] `RelatedProductsStrategy` por marca/tags — campos ainda não
  existem em `Product` (ver `docs/features/recommendations.md §3`)
- [ ] `CompleteKitStrategy`/`CartBasedStrategy` com dados reais de
  "comprados juntos" — hoje é uma tabela mock de merchandising
  (`src/lib/data/kit-pairings.ts`); dados reais exigiriam histórico de
  pedidos da Tiny

## Fase 2F — MVP Utilizável (concluída — Sprint 11)

Mudança de prioridade: de arquitetura para produto. Sprint de auditoria
e correção de bugs, sem funcionalidades novas. Ver
[SPRINT_11_REPORT.md](./SPRINT_11_REPORT.md) e
[MVP_CHECKLIST.md](./MVP_CHECKLIST.md) para o detalhamento completo de
todos os fluxos.

- [x] Fluxo de compra completo revisado e fechado (13 itens do brief,
  ver `MVP_CHECKLIST.md`)
- [x] Tratamento de erro real no checkout WhatsApp (popup bloqueado)
- [x] Mensagem do WhatsApp completa (nome/observação/subtotal/total/link do app)
- [x] Página 404 customizada
- [x] Botão "Voltar" com fallback seguro
- [x] Bug de galeria (botão morto) e duplicação de markup (estados
  vazios) corrigidos
- [ ] Número de WhatsApp, domínio real, fotos reais — ações de
  pré-lançamento, não bugs (ver `MVP_CHECKLIST.md`)

## Fase 2G — Go Live: Preparação para Produção (concluída — Sprint 12)

Auditoria completa como cliente de primeira vez. Ver
[GO_LIVE_REPORT.md](./GO_LIVE_REPORT.md).

- [x] Bug crítico corrigido: produto esgotado podia ser comprado
- [x] Todas as rotas navegadas e validadas (Home, categorias, busca,
  produto, favoritos, carrinho, WhatsApp, 404)
- [x] Nenhum link quebrado, botão sem ação, ou texto temporário
  encontrado além do já corrigido
- [x] Nível de prontidão avaliado: **8/10**
- [ ] Verificação visual de responsividade em dispositivo real — feita
  só por revisão de código nesta sprint (sem ferramenta de captura de
  tela disponível), recomendado antes do lançamento

## Fase 2H — Implantação do MVP (concluída — Sprint 13)

Preparação para operar com produtos reais — catálogo, documentação e
checklist operacional, sem mudança de código além de um comentário mais
claro no placeholder mais crítico. Ver
[SPRINT_13_REPORT.md](./SPRINT_13_REPORT.md).

- [x] Catálogo mock revisado quanto a consistência (nomes, preços,
  categorias, descrições, SKUs) — nenhuma inconsistência encontrada
- [x] `docs/PRODUCT_CATALOG_GUIDE.md` — campos obrigatórios/opcionais e
  como cadastrar produtos na Tiny para compatibilidade
- [x] `docs/PRODUCTION_CHECKLIST.md` — checklist operacional priorizado
  (domínio, variáveis de ambiente, Tiny, WhatsApp, imagens, banners,
  favicon, SEO, testes finais)
- [x] Mensagens ao usuário, estados vazios e imagens padrão revisados —
  nenhum texto técnico/temporário ou imagem quebrada encontrados
- [x] `docs/DELIVERY.md` atualizado (números de telas/rotas estavam
  desatualizados desde antes da Sprint 6)
- [ ] Número de WhatsApp real, domínio real, fotos reais — únicos itens
  que impedem o lançamento de fato, todos de configuração/conteúdo

## Fase 2I — Catálogo Facetado: consolidação de domínio (concluída — Sprint de Arquitetura do Catálogo)

Substituição de Categoria → Subcategoria por Categoria Principal (7
itens) + `Brand` (entidade própria) + facetas abertas
(`Product.attributes`/`ProductVariant.attributes`), com todo código
específico de fonte de dados isolado na camada de importação. Ver
[ARCHITECTURE_CATALOG.md](./ARCHITECTURE_CATALOG.md) (documento oficial)
e [docs/features/faceted-catalog.md](./features/faceted-catalog.md).

- [x] `Product`/`ProductVariant`/`Brand`/`Category` consolidados — ver
  diagrama de domínio em `ARCHITECTURE_CATALOG.md`
- [x] `FACET_REGISTRY` (9 facetas: linha, técnica, efeito, curvatura,
  espessura, comprimento, cor, material, volume) — nova faceta = uma
  linha, zero mudança de schema
- [x] Motor de consulta (`applyProductQuery`) filtra por `brandSlug`,
  `tags`, e atributos considerando produto **e** variante
- [x] Bug real corrigido: cor de produtos multi-variante estava sendo
  perdida (nem produto, nem variante) — agora vai para
  `variants[].attributes.cor`, com teste de regressão
- [x] Importador Nuvemshop atualizado: `brandSlug`/`barcode`/`tags`
  populados a partir de colunas reais; `nuvemshop-category-mapping.ts`
  renomeado para deixar explícito que é tradução de import, não domínio
- [x] `tiny-mapper.ts`: `gtin` (campo real, documentado) → `barcode`;
  `brandSlug`/`attributes`/`tags` documentados como sem fonte
  confirmada na Tiny hoje, não inventados
- [x] Auditoria arquitetural completa (SOLID/Clean Architecture,
  isolamento de fonte de dados, nomenclatura de domínio) — ver
  `ARCHITECTURE_CATALOG.md §7`
- [ ] Rota de SEO pré-filtrada (`/cilios/maria-sasha`), UI de filtros na
  Busca, página de marca com banner — arquitetura pronta
  (`resolveCatalogSlug`, `Brand.bannerImage`/`seoTitle`), UI ainda não
  construída (fora de escopo desta sprint por instrução explícita)

## Fase 3 — Refinamentos de conversão

- [x] Favoritos/lista de desejos — ver Fase 2C acima
- [ ] Avaliações reais de clientes (hoje `rating`/`reviewCount` são
  mockados no catálogo)
- [ ] Testar variações de copy no hero da Home (A/B simples)
- [ ] Sugestões de busca/autocomplete e histórico de buscas recentes —
  adiados na Sprint 6, ver Fase 2A acima

## Fase 4 — Explorações maiores (avaliar antes de comprometer)

Essas duas frentes têm documento de proposta próprio porque mudam a forma
como a loja é operada, não só o catálogo:

- **Painel administrativo** — ver [ADMIN_PANEL.md](./ADMIN_PANEL.md)
- **Assistente de IA para atendimento/recomendação** — ver
  [AI_ASSISTANT.md](./AI_ASSISTANT.md)

## Explicitamente fora de escopo (por enquanto)

- Login de cliente / conta de usuário
- Pagamento dentro do app (Pix, cartão) — hoje combinado no WhatsApp
- Rastreio de entrega
- Carrinho persistente entre dispositivos (hoje é por navegador, via
  localStorage)

Reavaliar essa lista só se o volume de pedidos ou uma dor operacional
específica justificar tirar alguma etapa do meio do WhatsApp. Não é um
"ainda não chegamos lá" — é uma escolha ativa de manter o fluxo simples
enquanto ele resolver o problema.
