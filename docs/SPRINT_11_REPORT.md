# Relatório da Sprint 11 — MVP Utilizável

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [MVP_CHECKLIST.md](./MVP_CHECKLIST.md)

## Contexto

A partir desta sprint, a prioridade deixou de ser arquitetura e passou a
ser produto: fechar o fluxo de compra de ponta a ponta e revisar tudo
que já existe com olhar de Product Owner + Tech Lead. Não foi uma
sprint de "features novas" — foi uma sprint de auditoria e correção.

**Leitura prévia**: `PROJECT_VISION.md`, `ROADMAP.md`, `CHANGELOG.md`,
`ARCHITECTURE.md`, `DESIGN_SYSTEM.md` — todos lidos antes de qualquer
alteração. `CLAUDE.md` não existe no projeto.

## O que foi corrigido

Bugs reais encontrados durante a revisão (não suposições — cada um
confirmado antes de corrigir):

1. **`window.open` sem tratamento de erro, em dois lugares** (Carrinho e
   "Comprar agora" na página do produto) — se o popup fosse bloqueado
   pelo navegador, o botão não fazia nada, sem nenhum aviso. Corrigido
   com `tryOpenWhatsApp()` centralizado (elimina a duplicação que
   existia entre os dois call sites) + `WhatsAppFallbackNotice` (link
   manual de fallback, visível quando a abertura automática falha).
2. **Mensagem do WhatsApp incompleta** — não incluía observação, nome do
   cliente, nem link do app (task 11 do brief), e só mostrava "Total",
   nunca "Subtotal" separadamente. Adicionados campos opcionais "Seu
   nome"/"Observação" na tela do Carrinho (estado local, sem
   persistência — não é uma conta de cliente, só preenche a mensagem) e
   `buildWhatsAppOrderMessage` agora inclui Subtotal + Total + Cliente
   (se preenchido) + Observação (se preenchida) + link do app (se
   `NEXT_PUBLIC_SITE_URL` estiver configurado de verdade, não o
   placeholder).
3. **`src/services/whatsapp.ts` sem nenhum teste** — arquivo central do
   fluxo de compra, zero cobertura antes desta sprint. 17 testes novos.
4. **Botão "Voltar" falha silenciosamente sem histórico de navegação** —
   como o principal ponto de entrada do app é um link direto do
   WhatsApp (não navegação interna), `router.back()` sem nenhum
   histórico prévio podia não fazer nada. Corrigido com fallback para
   `/` quando `window.history.length <= 1`.
5. **Nenhuma página 404 customizada existia** — o app caía na página
   genérica do Next.js. Criada uma com a marca. Durante a criação,
   encontramos e corrigimos **um bug de build real**: `Button asChild`
   (que usa `Slot` do Radix) quebrava a geração da rota especial
   `_not-found` do Next (`TypeError: n.createContext is not a
   function`) — resolvido usando um `<Link>` estilizado diretamente
   nessa página específica, sem depender do `Slot`.
6. **Botão morto na galeria de produto**: os pontinhos de navegação
   mudavam um estado `active`, mas nenhuma imagem diferente era exibida
   (o placeholder varia só por categoria, nunca por índice de foto) —
   um clique que não fazia nada de verdade. Corrigido: os pontos agora
   são um indicador estático honesto da quantidade de fotos, não uma
   interação falsa.
7. **Markup duplicado** entre os estados vazios do Carrinho e dos
   Favoritos (mesma estrutura, só emoji/texto diferentes) — extraído
   `src/components/ui/EmptyState.tsx`, usado nos dois lugares.
8. **Seção "Recomendado para Você" da Home duplicava conteúdo**: sua
   prioridade de fallback (mais-vendido/mais-novo) mostrava os mesmos
   produtos que "Mais Vendidos"/"Novidades" já exibiam acima, para
   qualquer visitante sem favoritos/carrinho — o caso mais comum.
   Corrigido ajustando a prioridade do `homeRecommendationProvider` para
   usar só sinais pessoais (favoritos, carrinho); sem esse sinal, a
   seção corretamente não renderiza nada, em vez de duplicar conteúdo.

## O que foi concluído (checklist do brief)

Os 13 itens do fluxo principal pedido no brief (abrir o app → navegar →
buscar → produto → fotos → informações → carrinho → quantidade →
remover → WhatsApp → mensagem completa → URL oficial → tratamento de
erro) estão todos funcionais — ver
[MVP_CHECKLIST.md](./MVP_CHECKLIST.md) para o detalhamento completo,
com 11 ✅, 1 ⚠️ (fotos reais — decisão de conteúdo, não bug de código) e
0 ❌ no fluxo principal.

## O que ainda impede colocar o MVP em produção

Nenhum desses é um bug — são decisões de configuração/conteúdo já
documentadas em sprints anteriores, necessárias antes do lançamento
real:

1. **Número de WhatsApp real** — hoje é um placeholder
   (`src/lib/config.ts`).
2. **Domínio real** (`NEXT_PUBLIC_SITE_URL`) — necessário para o Open
   Graph e o link do app na mensagem funcionarem fora deste ambiente.
3. **Fotos reais dos produtos** — hoje é o placeholder de marca.
4. **Credenciais reais da Tiny**, se/quando o suporte da Olist/Tiny for
   confirmado (aplicação já funciona 100% com o catálogo mock).

Nenhum desses bloqueia usar o MVP **com o catálogo mock atual** — só
bloqueia usá-lo com dados/contato reais de uma loja de verdade.

## Bugs encontrados

Todos listados na seção "O que foi corrigido" acima (itens 1, 4, 6 são
bugs de comportamento; item 5 é um bug de build; itens 2, 3, 7, 8 são
lacunas/duplicações encontradas na revisão, não bugs que quebravam a
aplicação, mas problemas reais de completude/UX).

## Melhorias deixadas propositalmente para versões futuras

- **Estoque zerado em item já no carrinho**: o `QuantityStepper` com
  `max=0` fica num estado de borda (nenhum dos dois botões faz sentido
  visualmente) — não é um crash, mas merece um tratamento dedicado
  (ex.: aviso "esgotado" na linha do carrinho) numa sprint futura, não
  corrigido agora para não introduzir uma funcionalidade nova
  (comportamento de "item indisponível no carrinho") fora do escopo de
  correção de bugs desta sprint.
- **Fotos reais**: trocar `ProductImagePlaceholder` por `<Image>` real
  é uma ação de pré-lançamento já documentada, não repetida aqui.
- **Analytics real, Tiny real, Lumi, painel administrativo**: todos
  fora de escopo por regra explícita desta sprint — arquitetura já
  pronta em sprints anteriores, aguardando decisão de negócio para
  ativar.

## Resultado de lint, testes e build

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros, 0 avisos |
| `npm run test` | ✅ **194/194** (17 novos — `whatsapp.test.ts`, antes inexistente) |
| `npm run build` | ✅ compila, 24 rotas (nova: `/_not-found` customizada) |

Confirmado manualmente (servidor real): todas as rotas (`/`, `/busca`
com e sem parâmetros, `/carrinho`, `/favoritos`, `/produto/[slug]` válido
e inválido, rota totalmente inexistente, `/manifest.webmanifest`,
`/icon`, `/apple-icon`) respondem com o código HTTP correto, sem nenhum
erro no log do servidor.

## Arquivos criados

`src/components/ui/EmptyState.tsx`, `src/components/ui/WhatsAppFallbackNotice.tsx`,
`src/app/not-found.tsx`, `src/services/whatsapp.test.ts`,
`docs/MVP_CHECKLIST.md`, `docs/SPRINT_11_REPORT.md`.

## Arquivos alterados

`src/services/whatsapp.ts`, `src/features/cart/components/WhatsAppCheckoutButton.tsx`,
`src/features/product/components/ProductDetail.tsx`,
`src/features/product/components/ProductGallery.tsx`,
`src/components/layout/BackHeader.tsx`, `src/app/carrinho/page.tsx`,
`src/app/favoritos/page.tsx`, `src/services/recommendations/index.ts`.
