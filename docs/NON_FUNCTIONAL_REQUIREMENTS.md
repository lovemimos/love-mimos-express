# Requisitos Não-Funcionais — Love Mimos Platform

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md). Este documento
> registra os requisitos que não aparecem em nenhuma tela, mas que
> definem se o produto é bom o suficiente para valer a pena usar — e como
> cada um é verificado hoje.

## 1. Performance

| Requisito | Meta | Como é verificado hoje |
|---|---|---|
| First Load JS por rota | < 160 kB | Reportado no output de `npm run build` (ver [DELIVERY.md](./DELIVERY.md)) — hoje entre 88 kB (`/_not-found`) e 151 kB (Home/Busca) |
| Tempo até interativo em 4G | Sensação de "instantâneo" — sem spinner de carregamento na navegação entre Home/Busca/Produto | Catálogo é mock e local; não há round-trip de rede na Fase 1 |
| Nenhuma imagem bloqueando o carregamento inicial | Placeholders são SVG inline, não arquivos de imagem | `ProductImagePlaceholder` não faz requisição de rede |
| Fontes não devem bloquear renderização | `display=swap` no link das Google Fonts | Ver decisão documentada em [PROJECT_VISION.md §5](./PROJECT_VISION.md#5-decisões-técnicas-e-por-quê) |

**Ainda não medido formalmente**: Core Web Vitals reais (LCP, INP, CLS) em
dispositivo físico — só foi validado que a aplicação builda e responde
200 em todas as rotas (ver [DELIVERY.md §2](./DELIVERY.md#2-o-que-foi-verificado-antes-da-entrega)).
Rodar Lighthouse/PageSpeed Insights contra o deploy real antes do
lançamento é um item do checklist em [DELIVERY.md §5](./DELIVERY.md#5-checklist-antes-de-publicar-para-clientes-reais).

**Com `DATA_SOURCE=tiny`** (implementado na Sprint 4): a meta de
performance passa a incluir o tempo de resposta da própria API da Tiny —
ver estratégia de cache em [API_TINY.md §6](./API_TINY.md#6-cache-e-revalidação).

## 2. Acessibilidade

| Requisito | Implementação |
|---|---|
| Indicador de foco visível | `focus-visible` consistente em toda a app (`globals.css`, herdado pelo componente `Button`) — nunca `outline: none` sem substituto |
| Respeito a `prefers-reduced-motion` | `globals.css` zera todas as animações (Tailwind e Framer Motion incluídos) quando o sistema operacional pede menos movimento |
| Contraste de cor | Paleta plum/rose/gold escolhida com contraste suficiente sobre `cream`/branco — ver tokens em [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) |
| Alvos de toque | Botões e controles usam altura mínima de 36-48px (`Button`, `QuantityStepper`, `TogglePill`) — adequado para toque em tela pequena |
| Semântica | `<button>` para ações, `<Link>` para navegação — nenhuma `<div onClick>` fazendo o papel de link/botão |

**Não verificado ainda**: auditoria com leitor de tela real (VoiceOver/
TalkBack) e teste de navegação só por teclado ponta a ponta. Não há meta
formal de conformidade WCAG declarada — tratar como WCAG 2.1 AA como
critério de bom senso, sem checklist de conformidade auditada.

## 3. Escalabilidade

| Cenário | Situação hoje | Quando revisitar |
|---|---|---|
| Catálogo cresce de 12 para centenas de produtos | Filtro em memória (`useMemo`), sem paginação | Se a Fase 2 (Tiny) trouxer um catálogo grande, a busca/listagem precisa de paginação ou busca no servidor — ver nota em [features/product.md §4](./features/product.md#4-decisões-e-por-quê) |
| Tráfego simultâneo alto | Next.js com páginas estáticas (`○ Static`) — escala horizontalmente sem estado de servidor | Rotas dinâmicas (`/produto/[slug]`) já são pré-renderizadas via `generateStaticParams` na Fase 1; na Fase 2, decidir entre ISR e SSR conforme volume |
| Estado do carrinho | Local ao navegador (Zustand + localStorage), sem limite de escala do lado do servidor | N/A — decisão de escopo, não gargalo técnico (ver [features/cart.md](./features/cart.md)) |

## 4. Confiabilidade e disponibilidade

- **Sem SLA formal**: não há contrato de uptime hoje — a recomendação de
  deploy (Vercel, ver [DELIVERY.md §4](./DELIVERY.md#4-recomendação-de-deploy))
  herda o SLA da própria plataforma escolhida.
- **Sem monitoramento de erro em produção configurado** (ex.: Sentry) —
  hoje, se algo quebrar, a única forma de saber é a cliente reportar. Isso
  é uma lacuna real, não uma decisão de escopo — candidato natural para a
  Fase 1 antes do lançamento (ver [DELIVERY.md](./DELIVERY.md)).
- **Página 404 tratada**: slug de produto inexistente devolve 404 real do
  Next.js (`notFound()`), testado em
  [DELIVERY.md §2](./DELIVERY.md#2-o-que-foi-verificado-antes-da-entrega).

## 5. Segurança

- **Nenhum segredo no repositório**: `.env.example` documenta
  `TINY_CLIENT_ID`/`TINY_CLIENT_SECRET`/`TINY_REFRESH_TOKEN` (nunca
  commitados — `.gitignore` já exclui `.env`) e o padrão `DATA_SOURCE=mock`
  não exige nenhuma credencial. Ver
  [API_TINY.md §2](./API_TINY.md#2-fluxo-de-autenticação-oauth2).
- **Número de WhatsApp em `lib/config.ts` é público por natureza** — é o
  mesmo número que a cliente vai usar para conversar, não é dado sensível.
- **Dependências**: `next` já foi atualizado uma vez por vulnerabilidade
  conhecida (ver [CHANGELOG.md v0.2.0](./CHANGELOG.md)) — não existe hoje
  um processo automatizado (ex.: Dependabot) de checagem contínua; é
  verificação manual antes de cada entrega.
- **Sem dado sensível de cliente armazenado**: o app não coleta nome,
  telefone ou endereço da cliente em nenhum formulário — essa informação
  só existe dentro da conversa do WhatsApp, fora do sistema.

## 6. Compatibilidade

- **Dispositivo-alvo primário**: celular, abrindo o link a partir do
  WhatsApp — layout fixo em `max-w-md` mesmo em desktop (ver
  [DESIGN_SYSTEM.md §11](./DESIGN_SYSTEM.md#mobile-first-sempre)).
- **Faixa de largura testada visualmente**: ~375px (iPhone SE) a ~430px
  (Android grande) — não foi testado abaixo de 360px nem em tablets.
- **Navegadores**: nenhum teste cross-browser formal foi feito; o alvo
  implícito é o WebView/navegador padrão do WhatsApp em iOS e Android, que
  cobre a Safari/Chrome moderno. Não há suporte declarado para navegadores
  antigos (ex.: IE, Safari muito desatualizado).

## 7. Observabilidade

Não existe hoje: analytics de uso (quantas pessoas chegam à Home vs.
abandonam no carrinho), rastreamento de erro em produção, ou log
estruturado de que porcentagem dos cliques em "Finalizar pedido" realmente
abre o WhatsApp com sucesso. Isso é uma lacuna consciente da Fase 1 — antes
de investir nisso, vale decidir uma ferramenta (ex.: Vercel Analytics,
Plausible, ou similar) alinhada com o volume real de tráfego esperado.

## 8. Internacionalização

Fora de escopo por design: a aplicação inteira é em português brasileiro
(textos, formatação de moeda em `formatBRL`, mensagem do WhatsApp). Não há
nenhuma camada de i18n — adicionar um segundo idioma hoje exigiria
reescrever strings espalhadas pelos componentes, não é uma configuração
que já existe e está desligada.

## 9. Conformidade (LGPD)

Como o app não coleta, armazena ou processa dados pessoais da cliente em
nenhum formulário (nome, telefone, e-mail, endereço) — essas informações
só trafegam dentro da conversa do WhatsApp, fora do sistema — a superfície
de exposição à LGPD hoje é mínima. Isso muda se qualquer funcionalidade
futura passar a coletar dado de cliente diretamente no app (ex.: um
formulário de cadastro, favoritos vinculados a conta) — nesse momento,
este documento precisa ganhar uma seção real de tratamento de dados
pessoais, não só a observação de que hoje não existe.

## 10. Como usar este documento

Assim como os demais documentos técnicos, todo requisito aqui deveria
estar amarrado a uma forma concreta de verificação — "meta" sem "como
verificar" não é um requisito, é um desejo. Ao adicionar uma funcionalidade
que muda algum desses números (ex.: aumenta o bundle, adiciona uma
dependência de rede síncrona, coleta um dado novo da cliente), atualizar a
linha correspondente aqui no mesmo commit — mesma regra de
[ENGINEERING_GUIDELINES.md §9](./ENGINEERING_GUIDELINES.md#9-documentação-obrigatória).
