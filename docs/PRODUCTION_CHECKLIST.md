# Checklist de Entrada em Produção

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [GO_LIVE_REPORT.md](./GO_LIVE_REPORT.md) (auditoria da Sprint 12) e
> [PRODUCT_CATALOG_GUIDE.md](./PRODUCT_CATALOG_GUIDE.md)

Este é o checklist operacional para quem for de fato publicar a Love
Mimos Express — não é um checklist de código (isso já foi validado nas
Sprints 11/12), é o que falta de **configuração e conteúdo** antes de
divulgar o link para clientes reais.

## 1. WhatsApp — 🔴 bloqueia o lançamento

- [ ] Trocar `whatsappNumber` em `src/lib/config.ts` pelo número real da
  loja (formato internacional, só dígitos — ver comentário no próprio
  arquivo para o formato exato)
- [ ] Testar o botão "Finalizar pedido no WhatsApp" **em um celular
  real**, com o WhatsApp instalado, antes de divulgar o link — o
  comportamento com popup bloqueado já tem fallback (ver
  [GO_LIVE_REPORT.md](./GO_LIVE_REPORT.md)), mas vale confirmar a
  experiência ponta a ponta com o número real
- [ ] Confirmar que a mensagem gerada (nome dos produtos, quantidade,
  subtotal, total, observação, nome da cliente se preenchido, link do
  app) está com a formatação esperada no WhatsApp real (emojis, quebras
  de linha)

## 2. Domínio — recomendado, não bloqueia o catálogo mock

- [ ] Configurar o domínio próprio na plataforma de deploy escolhida
  (ver [DELIVERY.md §4](./DELIVERY.md#4-recomendação-de-deploy))
- [ ] Definir a variável de ambiente `NEXT_PUBLIC_SITE_URL` com esse
  domínio (ver `.env.example`) — sem isso, o Open Graph (preview ao
  compartilhar no WhatsApp) e o link do app na mensagem de checkout
  simplesmente não aparecem, mas nada quebra

## 3. Variáveis de ambiente

- [ ] `NEXT_PUBLIC_SITE_URL` — ver item 2
- [ ] `DATA_SOURCE` — manter `mock` (ou omitir, é o padrão) até a Tiny
  estar homologada; nunca definir `tiny` sem ter passado pela Fase 3 da
  Sprint 5 (homologação real, ver [SPRINT_5_REPORT.md](./SPRINT_5_REPORT.md))
- [ ] Se/quando `DATA_SOURCE=tiny` for ativado: `TINY_CLIENT_ID`,
  `TINY_CLIENT_SECRET`, `TINY_REFRESH_TOKEN` configurados como segredos
  na plataforma de deploy — **nunca em arquivo versionado** (ver
  `.env.example` e [API_TINY.md §2](./API_TINY.md#2-fluxo-de-autenticação-oauth2))
- [ ] Conferir `/dev/tiny-status` retorna 404 no ambiente de produção
  publicado (já testado neste ambiente de desenvolvimento — reconfirmar
  após o deploy real, já que é uma verificação de uma linha)

## 4. Tiny ERP — 🔵 fora de escopo até o suporte da Olist/Tiny ser confirmado

- [ ] Aguardando confirmação do suporte da Olist/Tiny (ver
  [ROADMAP.md](./ROADMAP.md) Fase 2) — **o app funciona 100% em
  produção com `DATA_SOURCE=mock` enquanto isso não acontece**
- [ ] Quando a homologação real acontecer: seguir o checklist da
  [SPRINT_5_REPORT.md](./SPRINT_5_REPORT.md) (Fase 3 — nunca pulada)
  antes de ativar `DATA_SOURCE=tiny` em produção
- [ ] Cadastrar produtos reais seguindo o
  [PRODUCT_CATALOG_GUIDE.md](./PRODUCT_CATALOG_GUIDE.md)

## 5. Imagens — recomendado, não bloqueia (placeholder nunca quebra)

- [ ] Substituir `ProductImagePlaceholder` por fotos reais dos produtos
  em `ProductGallery.tsx` e `ProductCard.tsx` — enquanto isso não
  acontece, o placeholder de marca aparece normalmente, nunca uma
  imagem quebrada (ver [PRODUCT_CATALOG_GUIDE.md §5](./PRODUCT_CATALOG_GUIDE.md#5-imagens-o-que-existe-hoje))
- [ ] Se fotos forem adicionadas, confirmar que todas carregam (sem
  404) antes de publicar — um teste manual rápido em cada produto

## 6. Banners

- [ ] Revisar o texto do banner principal em `src/lib/data/banners.ts`
  com o time de produto — hoje reflete a proposta de valor genérica da
  loja, não uma campanha específica
- [ ] Se uma campanha sazonal for necessária, adicionar um segundo
  banner ao array — `HomeHero` já sabe alternar entre múltiplos
  automaticamente, sem mudança de código (ver
  [docs/features/home.md §4](./features/home.md#4-contrato-herobanner))

## 7. Favicon, ícone de app, Open Graph, manifest PWA

- [x] Já gerados automaticamente via `next/og` desde a Sprint de
  Branding — nenhuma ação necessária, exceto:
- [ ] Reconfirmar a aparência do preview de Open Graph depois que o
  domínio real (`NEXT_PUBLIC_SITE_URL`, item 2) estiver configurado —
  compartilhar o link real numa conversa de teste do WhatsApp e conferir
  a prévia

## 8. SEO

- [ ] Título e descrição de metadados (`src/app/layout.tsx`) já
  descrevem a loja — revisar se o texto ainda reflete o posicionamento
  atual antes de publicar
- [ ] `NEXT_PUBLIC_SITE_URL` configurado (item 2) — necessário para que
  tags de Open Graph gerem URLs absolutas corretas
- [ ] Fora de escopo por decisão de produto (não construído, não é uma
  pendência): sitemap.xml, robots.txt customizado, structured data
  (schema.org/Product) — considerar numa sprint futura de SEO dedicada
  se a aquisição orgânica via busca se tornar prioridade

## 9. Testes finais antes de divulgar o link

- [ ] `npm run lint`, `npm run test`, `npm run build` — todos passando
  (ver resultado na Sprint 13, [SPRINT_13_REPORT.md](./SPRINT_13_REPORT.md))
- [ ] Percorrer o fluxo completo (Home → categoria → busca → produto →
  favoritar → carrinho → alterar quantidade → checkout WhatsApp) **em
  um celular real**, não só no navegador de desenvolvimento
- [ ] Testar com o WhatsApp número real configurado (item 1)
- [ ] Testar compartilhar o link da loja numa conversa e conferir a
  prévia de Open Graph (item 7)

## Resumo por prioridade

| Prioridade | Itens |
|---|---|
| 🔴 Bloqueia o lançamento | Número de WhatsApp real (§1) |
| 🟡 Recomendado antes de divulgar | Domínio + `NEXT_PUBLIC_SITE_URL` (§2), fotos reais (§5), teste em celular real (§9) |
| 🔵 Fora de escopo por enquanto | Tiny real (§4, aguardando confirmação externa), SEO avançado (§8) |
