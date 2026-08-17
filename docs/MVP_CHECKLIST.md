# MVP Checklist — Love Mimos Express

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [SPRINT_11_REPORT.md](./SPRINT_11_REPORT.md)

Legenda: ✅ Pronto · ⚠️ Parcial (funciona, mas com limitação conhecida) · ❌ Pendente

## Fluxo principal de compra

| # | Fluxo | Status | Observação |
|---|---|---|---|
| 1 | Abrir o aplicativo | ✅ | Home carrega, splash de marca uma vez por sessão |
| 2 | Navegar pelas categorias | ✅ | `CategoryPills` (filtro em página) + `HomeCategories` (vitrine com link para `/busca?categoria=`) |
| 3 | Pesquisar produtos | ✅ | Busca tolerante a acento/espaço/caixa, com URL compartilhável (`/busca?q=`) |
| 4 | Entrar na página do produto | ✅ | Rota estática por slug, 404 honesto para slug inexistente |
| 5 | Visualizar fotos | ⚠️ | Galeria funcional, mas usa **placeholder de marca**, não fotos reais — indicador de quantidade de fotos agora é honesto (estático, não finge trocar imagem) desde a correção desta sprint. Trocar por `<Image>` real é ação de pré-lançamento já documentada em `README.md`/`DELIVERY.md`. |
| 6 | Visualizar informações do produto | ✅ | Nome, preço, descrição, estoque, variação (quando existe), badge |
| 7 | Adicionar ao carrinho | ✅ | Incrementa quantidade se já existe, nunca duplica linha |
| 8 | Alterar quantidade | ✅ | Respeita limite de estoque (`max={product.stock}`) no carrinho e no produto |
| 9 | Remover itens | ✅ | Botão de remover na linha do carrinho; quantidade 0 também remove |
| 10 | Finalizar pelo WhatsApp | ✅ | Corrigido nesta sprint: trata popup bloqueado com fallback visível |
| 11 | Mensagem completa (produtos, quantidade, subtotal, total, observação, cliente, link do app) | ✅ | Corrigido nesta sprint: campos de nome/observação adicionados ao Carrinho; subtotal e total agora explícitos na mensagem; link do app incluído se `NEXT_PUBLIC_SITE_URL` estiver configurado |
| 12 | Abrir automaticamente o WhatsApp (URL oficial) | ✅ | `https://wa.me/{numero}?text=...` — domínio oficial |
| 13 | Tratar erro se o WhatsApp não estiver disponível | ✅ | Corrigido nesta sprint: `tryOpenWhatsApp()` detecta popup bloqueado, mostra link manual de fallback |

## Outras telas e estados

| Tela/estado | Status | Observação |
|---|---|---|
| Home — hero, busca, categorias, grid | ✅ | |
| Home — Continue Comprando / Seus Favoritos | ✅ | Não renderizam quando vazios (comportamento correto) |
| Home — Mais Vendidos / Novidades | ✅ | |
| Home — Recomendado para Você | ✅ | Corrigido nesta sprint: prioridade ajustada para não duplicar Mais Vendidos/Novidades quando não há sinal pessoal |
| Carrinho — estado vazio | ✅ | Usa `EmptyState` compartilhado (extraído nesta sprint) |
| Carrinho — "Continuar comprando" / "Limpar carrinho" | ✅ | |
| Carrinho — barra de frete grátis | ✅ | |
| Carrinho — recomendações ("Complete seu Pedido") | ✅ | |
| Favoritos — estado vazio | ✅ | Usa `EmptyState` compartilhado |
| Favoritos — "Limpar favoritos" | ✅ | |
| Página de produto — variações, quantidade, favoritar | ✅ | |
| Página de produto — recomendações ("Você também pode gostar") | ✅ | |
| Botão "Voltar" (BackHeader) | ✅ | Corrigido nesta sprint: fallback para `/` quando não há histórico (caso comum: abrir direto de um link do WhatsApp) |
| Página 404 | ✅ | Criada nesta sprint (não existia — caía no genérico do Next) |
| Estados de carregando/erro (busca, grid, seções da Home) | ✅ | |
| Favicon / ícone de app / Open Graph / manifest PWA | ✅ | |
| `/dev/tiny-status` (diagnóstico interno) | ✅ | Confirmado: 404 real em produção, nunca exposto na navegação |

## Integrações e infraestrutura (fora do escopo desta sprint, por regra explícita)

| Item | Status | Observação |
|---|---|---|
| Integração real com a Tiny ERP | ❌ | Aguardando confirmação do suporte da Olist/Tiny (ver `API_TINY.md`); app funciona 100% com `MockProductRepository` |
| Número de WhatsApp real | ❌ | Placeholder documentado (`src/lib/config.ts`) — ação de pré-lançamento, não um bug de código |
| Domínio real (`NEXT_PUBLIC_SITE_URL`) | ❌ | Placeholder documentado — necessário para Open Graph e link do app na mensagem funcionarem em produção |
| Fotos reais dos produtos | ❌ | Placeholder de marca em uso — ver item 5 acima |
| Login/conta de cliente | ❌ | Fora de escopo por decisão de produto (ver `PROJECT_VISION.md`) |
| Analytics real (provedor conectado) | ❌ | Estrutura pronta (`src/lib/analytics.ts`), sem integração — fora de escopo desta sprint |
| Assistente Lumi / IA | ❌ | Fora de escopo por decisão de produto |
| Painel administrativo | ❌ | Fora de escopo — ver `ADMIN_PANEL.md` (proposta especulativa) |

## Resumo

**11 dos 13 itens do fluxo principal de compra estão ✅ Prontos; 1 está ⚠️ Parcial (fotos reais, decisão de conteúdo, não de código) e 0 estão ❌ Pendentes.** Os itens "fora de escopo" na segunda tabela são decisões de produto documentadas desde sprints anteriores, não lacunas descobertas nesta revisão — nenhum deles bloqueia o uso do MVP com o catálogo mock atual.
