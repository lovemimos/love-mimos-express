# Design System — Love Mimos Platform

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md). **Este é o
> documento de referência oficial de design de toda a interface da
> plataforma Love Mimos.** Toda tela nova, todo componente novo e toda
> variação visual devem se justificar por uma regra ou token definido
> aqui — ver §14.

## 1. Conceito da marca

A Love Mimos é:

- **Premium** — nunca parece uma loja genérica de template. Paleta,
  tipografia e o motivo visual autoral (a curva de cílio, ver §8) existem
  para isso.
- **Feminina** — sem cair em "rosa claro infantil". A sofisticação vem do
  contraste entre o plum escuro e o rosa vibrante, não de tons pastel.
- **Minimalista** — cada tela mostra só o que a cliente precisa para
  decidir agora. Se um elemento não ajuda a decisão de compra, ele não
  entra na tela.
- **Moderna** — motion com propósito (§10), tipografia com peso e
  contraste (§4), nunca uma UI "estática" ou datada.
- **Mobile First** — não é um breakpoint entre outros, é a única
  experiência que existe (ver §11).
- **Aparência de aplicativo** — não de site institucional. Bottom
  navigation, cards, chips, gestos e feedback tátil (`active:scale`) o
  tempo todo — nunca um link azul sublinhado ou um formulário de HTML puro.

## 2. Princípios de UX

| Princípio | Como se traduz em regra concreta |
|---|---|
| Máximo de 3 toques até encontrar um produto | Home → categoria/busca → card do produto = 2 toques até o detalhe; adicionar ao carrinho é o 3º. Nenhum fluxo de navegação pode introduzir uma tela intermediária "de passagem". |
| Carrinho sempre acessível | Ícone de carrinho fixo no `Header` (com badge de contagem) e no `BottomNav` em todas as telas — nunca escondido em menu. |
| Pesquisa sempre visível | `SearchBar` fixa no topo da Home e da tela de Busca, nunca atrás de um ícone que precisa ser tocado para revelar o campo. |
| Interface limpa | Um propósito por tela; hero só na Home (ver [features/home-and-search.md](./features/home-and-search.md)). |
| Pouco texto | Descrições curtas no card (`shortDescription`), detalhada só na página de produto. Nenhum parágrafo de texto institucional na Home. |
| Fotos grandes | Imagem do produto ocupa a largura total do card/tela — nunca thumbnail pequeno com texto ao lado (padrão "lista", que é o oposto do padrão "app premium"). |
| Botões grandes | Altura mínima de 44px em CTAs primários (`Button size="lg"` = 48px) — alvo de toque confortável em qualquer celular. |
| Navegação intuitiva | `BottomNav` com no máximo 3 itens, ícone + label sempre juntos — nunca só ícone sem legenda em navegação primária. |

## 3. Paleta de cores

Todos os tokens abaixo vivem em `tailwind.config.js` — **nenhuma cor deve
ser escrita como hex direto em um componente**; usar sempre a classe do
token (ver regra em §14 e em
[ENGINEERING_GUIDELINES.md §4](./ENGINEERING_GUIDELINES.md#4-regra-de-cores-nunca-fixa)).

### Primária

| Token | Hex | Uso |
|---|---|---|
| `rose-500` | `#C6376B` | Cor de ação principal — preços, CTAs, links ativos |
| `rose-600` | `#A82C58` | Hover/active de elementos rosa |
| `rose-700` | `#8B2249` | Estado pressionado, texto sobre fundo rosa claro |

### Secundária

| Token | Hex | Uso |
|---|---|---|
| `plum` (DEFAULT) | `#3B0F2B` | Cor de marca em superfícies escuras (hero, header ativo), texto do logo |
| `plum-light` | `#5A1F44` | Gradientes e variações de superfícies escuras |
| `gold` (DEFAULT) | `#D4AF7A` | Acento premium — badges, traço do logo. Usar com moderação, nunca como cor de fundo grande |
| `gold-light` | `#E8D3AE` | Gradientes de acento |

### Neutras

| Token | Hex | Uso |
|---|---|---|
| `cream` | `#FFFBF8` | Fundo base de toda a aplicação |
| `neutral-0` | `#FFFFFF` | Branco puro — superfícies de card sobre `cream` |
| `neutral-50` | `#FAF8F7` | Fundo alternativo muito sutil |
| `neutral-100` | `#F1ECEA` | Divisores, bordas utilitárias sem matiz de marca |
| `neutral-200` | `#E2DAD7` | Bordas em estado desabilitado |
| `neutral-300` | `#C9BDB9` | Placeholder de texto em inputs |
| `neutral-500` | `#857773` | Texto secundário neutro (quando `ink/60` não for específico o suficiente) |
| `neutral-700` | `#4A413F` | Texto neutro de maior ênfase |
| `ink` | `#2B2229` | Texto primário — usar `ink/opacidade` (ex.: `text-ink/60`) para hierarquia, não uma cor neutra separada |
| `rose-100` | `#F7E4E4` | Bordas com leve matiz de marca — usar quando o elemento é parte de uma superfície "de produto/marca", não um divisor genérico |

**Regra de escolha entre `neutral-*` e `rose-100`/`ink`**: `rose-100` é
para bordas de elementos que fazem parte da experiência de produto
(cards, inputs de busca); `neutral-*` é para chrome utilitário puro
(divisores de lista, estados desabilitados) onde nem um leve tom de marca
faz sentido.

**Regra**: superfícies brancas usam sempre `bg-neutral-0`, nunca o
`bg-white` nativo do Tailwind — mesmo hex (`#FFFFFF`), mas `neutral-0` é
o token documentado e rastreável do sistema. `text-white` continua
normal para texto sobre fundo escuro (`plum`/`rose-500`) — isso não é uma
superfície, é contraste de texto, caso diferente.

### Sucesso

| Token | Hex | Uso |
|---|---|---|
| `success-50` | `#EAF7EF` | Fundo de banner/toast de sucesso |
| `success-500` | `#2F9E5B` | Ícone/texto de confirmação (ex.: "pedido registrado") |
| `success-700` | `#1F7A44` | Texto de sucesso sobre `success-50` |

**Nunca usar `whatsapp` (`#25D366`) como cor de sucesso genérico** — esse
verde é reservado exclusivamente para o botão de finalizar pedido, para
continuar sinalizando "isso abre o WhatsApp" sem ambiguidade.

### Alerta

| Token | Hex | Uso |
|---|---|---|
| `alert-50` | `#FDF3E3` | Fundo de aviso (ex.: "só restam 2 unidades") |
| `alert-500` | `#E0A526` | Ícone/texto de alerta |
| `alert-700` | `#B37D14` | Texto de alerta sobre `alert-50` |

### Erro

| Token | Hex | Uso |
|---|---|---|
| `error-50` | `#FCEAEA` | Fundo de mensagem de erro |
| `error-500` | `#D93B3B` | Ícone/texto de erro (ex.: falha ao abrir o WhatsApp) |
| `error-700` | `#A62A2A` | Texto de erro sobre `error-50` |

**Por que `error-500` não é um tom de rosa**: a paleta primária já é
rosa/magenta; um vermelho de erro na mesma família de matiz criaria
ambiguidade entre "isso é um CTA de marca" e "isso é um erro". `error-500`
é deliberadamente mais próximo do vermelho puro.

**Exceção sancionada — arte placeholder de produto**: `ProductImagePlaceholder`
usa hex literal em `style={{ background: linear-gradient(...) }}`, porque
gradientes CSS inline não aceitam classes Tailwind. Os valores são cópias
exatas dos tokens acima (nunca um hex inventado) — ver comentário no topo
do arquivo. Esta é a única exceção sancionada à regra "nenhuma cor hex
direta" em todo o código.

### Hierarquia de opacidade de texto

Texto secundário sobre `ink` usa sempre um destes três valores — nunca um
valor ad-hoc entre eles:

| Tier | Classe | Uso |
|---|---|---|
| Secundário | `text-ink/70` | Descrição, subtítulo, texto de apoio com peso considerável |
| Terciário/meta | `text-ink/50` | Contagem, label de metadado, texto de rodapé de card |
| Mudo/riscado | `text-ink/35` | Preço original riscado, texto quase decorativo |

## 4. Tipografia

Fontes: **Fraunces** (`font-display`) para todo texto de destaque,
**Plus Jakarta Sans** (`font-sans`) para UI/corpo. Carregamento e
justificativa em [PROJECT_VISION.md §5](./PROJECT_VISION.md#5-decisões-técnicas-e-por-quê).

| Nível | Tamanho | Classe Tailwind | Peso | Fonte | Uso |
|---|---|---|---|---|---|
| H1 | 28px / 1.75rem | `text-h1` | 600 | `font-display` | Título do hero da Home |
| H2 | 22px / 1.375rem | `text-h2` | 600 | `font-display` | Título de seção (ex.: "Todos os produtos") |
| H3 | 18px / 1.125rem | `text-lg` *(nativo do Tailwind, já exato)* | 600 | `font-display` | Nome do produto na página de detalhe |
| Títulos (de card) | 15px / 0.9375rem | `text-title` | 500 | `font-sans` | Nome do produto no card do grid |
| Texto (corpo) | 14px / 0.875rem | `text-sm` *(nativo, já exato)* | 400 | `font-sans` | Descrições, parágrafos |
| Legendas | 12px / 0.75rem | `text-xs` *(nativo, já exato)* | 500 | `font-sans` | Badges, avaliação, metadados, labels de seção |
| Botões | 14px / 0.875rem | `text-sm` *(nativo, já exato)* | 600 | `font-sans` | Label de qualquer `Button`, sempre o mesmo tamanho em todos os `size` — só altura/padding variam por tamanho |
| Micro *(chrome de UI, não é conteúdo)* | 11px / 0.6875rem | `text-micro` | 500 | `font-sans` | Label do bottom nav, badge numérico de contagem, texto "eyebrow" acima de um H1 |

`h1`, `h2`, `title` e `micro` são tokens custom definidos em
`tailwind.config.js` — os demais (`text-lg`, `text-sm`, `text-xs`) já são
exatamente os tamanhos nativos do Tailwind, sem necessidade de override.

**Regra**: `font-display` (Fraunces) é reservada para H1/H2/H3 e preço em
destaque — nunca usar em texto de corpo ou legendas, onde prejudicaria a
legibilidade em telas pequenas.

## 5. Espaçamento

Sistema baseado em múltiplos de 8px, usando a escala padrão do Tailwind
(que já é múltipla de 4px — restringimos o uso aos valores pares/múltiplos
de 8, com uma única exceção documentada).

| Token | Valor | Classe Tailwind | Uso |
|---|---|---|---|
| space-1 *(exceção)* | 4px | `gap-1` / `p-1` | Só para gap entre ícone e texto inline — nunca para padding/margin de layout |
| space-2 | 8px | `gap-2` / `p-2` | Espaço entre elementos pequenos (ícone + label, itens de lista compacta) |
| space-3 | 16px | `p-4` / `gap-4` | Padding padrão de card, gap entre cards no grid |
| space-4 | 24px | `p-6` / `gap-6` | Padding de seções, respiro entre blocos de conteúdo |
| space-5 | 32px | `p-8` | Padding de superfícies grandes (hero, bottom sheet) |
| space-6 | 40px | `p-10` | Espaço entre seções distintas da tela |
| space-7 | 48px | `p-12` | Áreas de destaque/vazio (estado vazio do carrinho) |
| space-8 | 64px | `p-16` | Espaçamento vertical de estados de página inteira (empty state, 404) |

**Regra**: se um espaçamento não corresponde a nenhum token acima, ele
está errado — ajustar para o múltiplo de 8 mais próximo, não introduzir
um valor arbitrário (`p-5`, `p-7`, `m-9` etc. estão fora do sistema).

**Exceção sancionada — altura de alvos de toque**: `Button` usa alturas de
36/40/44/48px (`h-9`/`h-10`/`h-11`/`h-12`), que não são múltiplos de 8.
Isso é deliberado: essas alturas seguem os mínimos de toque confortável
de iOS/Android (Apple HIG recomenda 44px), um padrão de plataforma que
tem prioridade sobre a escala interna de espaçamento de conteúdo. A
exceção vale só para **altura de controles de toque** — o padding
horizontal desses mesmos botões (`px-4`/`px-6`) continua na escala de 8.

## 6. Border Radius

| Token | Valor | Classe Tailwind | Uso |
|---|---|---|---|
| radius-xs | 6px | `rounded-md` | Elementos internos pequenos (ícone dentro de chip) |
| radius-sm | 8px | `rounded-lg` | Inputs de formulário simples |
| radius-md | 12px | `rounded-xl` | Barra de busca, inputs de destaque |
| radius-lg | 16px | `rounded-2xl` | Cards de produto, linha do carrinho, placeholders de imagem |
| radius-xl | 20px | `rounded-xl2` *(custom)* | Superfícies intermediárias (ex.: barra de frete grátis) |
| radius-2xl | 28px | `rounded-3xl` *(override custom)* | Hero banner, Bottom Sheet, Modal |
| radius-full | 9999px | `rounded-full` | Botões, chips, badges, avatar |

**Regra**: botões e chips são **sempre** `radius-full` (pílula) — nunca
canto reto ou levemente arredondado, isso é o que distingue o tom
"boutique" do tom "utilitário" (ver §1).

## 7. Sombras

| Token | Classe | Uso |
|---|---|---|
| `shadow-card` | `shadow-card` | Superfícies em repouso — cards de produto, linha do carrinho |
| `shadow-soft` | `shadow-soft` | Superfícies grandes em destaque (hero) |
| `shadow-lift` | `shadow-lift` | CTAs que precisam se destacar — pills ativas, botão de WhatsApp |
| `shadow-modal` | `shadow-modal` | Bottom Sheet e Modal — sombra mais pesada, projetada para cima (o elemento "sobe" sobre o conteúdo) |

## 8. Componentes

Padrão geral: todo componente de UI compartilhado vive em
`src/components/ui/`; componentes específicos de um domínio vivem em
`src/features/<dominio>/components/` (ver
[ENGINEERING_GUIDELINES.md §3](./ENGINEERING_GUIDELINES.md#3-arquitetura-feature-first)).
"✅ Implementado" = existe hoje em código; "🧭 Especificado" = padrão
definido aqui, ainda não construído.

### Botões — ✅ `src/components/ui/button.tsx`

Variantes: `primary` (rose-500, ação principal), `secondary` (outline
plum), `ghost` (sem fundo), `whatsapp` (verde, exclusivo de checkout),
`link`. Tamanhos: `sm` (36px), `default` (44px), `lg` (48px), `icon`
(40×40px). Sempre `radius-full`. Nunca instanciar um `<button>` com
classes soltas fora deste componente.

### Cards — ✅ `ProductCard.tsx` / `CartLineItem.tsx`

`radius-lg`, `shadow-card`, imagem grande no topo (proporção quadrada),
conteúdo com no máximo: título, 1 linha de metadado (nota ou variante),
preço. Nunca mais de 3 blocos de informação por card.

### Inputs — ✅ implícito em `SearchBar.tsx`, 🧭 formulário genérico não existe ainda

`radius-md`, borda `rose-100`, fundo `neutral-0`, placeholder em
`neutral-300`. Estado de foco usa o mesmo anel de `focus-visible` (rosa)
definido globalmente em `globals.css`.

### Barra de busca — ✅ `SearchBar.tsx`

Input com ícone de lupa à esquerda (fixo, não decorativo — sinaliza a
função antes da cliente tocar) e botão de limpar à direita quando há
texto. Sempre visível no topo, nunca atrás de um ícone (ver §2).

### Chips de categoria — ✅ `CategoryPills.tsx` + `TogglePill` (`components/ui/toggle-pill.tsx`)

Pílula (`radius-full`), estado ativo = fundo `plum` sólido + `shadow-lift`;
estado inativo = borda `rose-100` + fundo `neutral-0`. O mesmo componente
`TogglePill` também é usado no seletor de variação do produto — nunca
duplicar essa lógica de estado (ver
[ENGINEERING_GUIDELINES.md §5](./ENGINEERING_GUIDELINES.md#5-componentização)).

### Bottom Navigation — ✅ `BottomNav.tsx`

Fixo, 3 itens (Início, Buscar, Carrinho), ícone (`lucide-react`) + label
sempre juntos, badge de contagem sobre o ícone do carrinho. Nunca mais de
3 itens — um quarto item aqui violaria o princípio de interface limpa (§2).

### Carrinho — ✅ `features/cart/components/*`

Ver [features/cart.md](./features/cart.md) para o detalhamento completo
(linha de item, barra de frete grátis, botão de checkout).

### Badges — ✅ `ProductBadge.tsx`

Três variantes fixas e só essas três: `novo` (plum/branco),
`mais-vendido` (gold/plum), `promocao` (rose/branco). `radius-full`,
texto em Legendas (12px, peso 500), uppercase, `tracking-wide`.

### Tags — 🧭 Especificado, ainda não implementado como componente próprio

Visualmente idênticas às Badges (mesmo `radius-full`, mesmo tamanho de
texto), mas semanticamente diferentes: Tags descrevem um **atributo**
neutro do produto (ex.: "hipoalergênico", "vegano"), não um estado de
marketing. Usar fundo `neutral-100` + texto `neutral-700` — nunca as
cores de marca (`rose`/`gold`/`plum`) reservadas às Badges, para a
cliente distinguir "isso é uma promoção" de "isso é uma característica".

### Banner — ✅ hero da Home, 🧭 como componente reutilizável ainda não extraído

Hoje implementado inline em `src/app/page.tsx` (fundo `plum`, `radius-2xl`,
`shadow-soft`). Se um segundo banner promocional for necessário no
futuro, extrair para `src/components/ui/banner.tsx` antes de duplicar o
padrão — mesma regra de nunca copiar estilo entre dois lugares.

### Bottom Sheet — 🧭 Especificado, ainda não implementado

Para ações contextuais que não justificam uma tela cheia (ex.: detalhes
rápidos de frete, seleção de forma de contato). Regras quando for
construído: `radius-2xl` só nos cantos superiores, `shadow-modal`, alça
visual (`handle`) de 32×4px centralizada no topo, fundo `neutral-0`,
nunca mais alto que 80% da viewport.

### Modais — 🧭 Especificado, ainda não implementado

Reservados para confirmações que interrompem o fluxo (ex.: "remover item
do carrinho?", **se** essa confirmação vier a ser adicionada — hoje
remover não pede confirmação, ver
[features/cart.md §4](./features/cart.md#4-decisões-e-por-quê)). Fundo
`neutral-0`, `radius-lg`, `shadow-modal`, overlay `ink/40` atrás. Sempre
com botão de ação primária (`Button variant="primary"`) e uma saída
secundária clara (`variant="ghost"`), nunca só um "X" no canto como única
forma de fechar.

## 9. Ícones

**Biblioteca oficial: [`lucide-react`](https://lucide.dev/)** — já em uso
em `CategoryIcon.tsx`, `Header.tsx`, `BottomNav.tsx`, `Rating.tsx`, etc.

Regras:
- Nunca emoji cru como ícone funcional de UI (o 🎀 no estado vazio do
  carrinho é uma exceção deliberada de tom afetivo, não um ícone
  funcional).
- Tamanhos padronizados: 13px (dentro de chip/pill), 16-19px (botões e
  header), 20px (bottom navigation).
- `strokeWidth` padrão da lib (2), exceto estado ativo do `BottomNav`
  (2.4) para reforçar seleção sem trocar de ícone.

## 10. Animações

**Biblioteca oficial: Framer Motion**, para toda animação que comunica
estado (ver exemplos em
[ENGINEERING_GUIDELINES.md §6](./ENGINEERING_GUIDELINES.md#6-animação-discreta-e-com-propósito)).
Animações puramente decorativas (logo se desenhando, badge "pulsando")
continuam via `keyframes` do Tailwind — não precisam da API de gestos do
Framer Motion.

**Tempo máximo: 250ms** para qualquer transição de UI (hover, tap, troca
de estado, stagger por item). Exceção documentada: a animação de "desenho"
do logo (`animate-lash-draw`, 1.1s) — é uma animação de entrada única, não
uma resposta a interação, então a regra dos 250ms não se aplica a ela.

| Padrão | Duração | Onde |
|---|---|---|
| `whileTap={{ scale: 0.97 }}` | instantâneo (spring padrão) | Qualquer botão de ação importante (ex.: checkout) |
| Troca de texto/estado (`AnimatePresence`) | 150ms | "Adicionar ao carrinho" → "Adicionado" |
| Stagger de lista | 40ms por item, entrada em ≤ 250ms total para os itens visíveis | Grid de produtos |
| Entrada de conteúdo (`opacity`/`y`) | 250ms | Lista de itens do carrinho |

Todas respeitam `prefers-reduced-motion` (zeradas globalmente em
`globals.css`) — não precisa de tratamento caso a caso por componente.

## 11. Responsividade

A aplicação é **Mobile First** — não como breakpoint inicial de um layout
que depois expande, mas como a única experiência que existe.

### Mobile-first, sempre

O layout inteiro é limitado a `max-w-md` (ver `src/app/layout.tsx`),
inclusive em desktop — a experiência não "expande" para uma versão
desktop diferente, ela permanece com a proporção de celular centralizada
na tela. Isso é intencional: o produto é para ser aberto a partir de um
link do WhatsApp no celular (ver
[VISION.md](../VISION.md)), então otimizar para uma variante desktop
ampla seria esforço gasto num caso de uso secundário.

Faixa de largura considerada: ~375px (iPhone SE) a ~430px (Android
grande) — ver lacunas de teste em
[NON_FUNCTIONAL_REQUIREMENTS.md §6](./NON_FUNCTIONAL_REQUIREMENTS.md#6-compatibilidade).

## 12. Acessibilidade

- `focus-visible` consistente em todo elemento interativo (herdado de
  `globals.css` e do componente `Button`) — nunca remover outline sem
  substituir por um indicador visível.
- Contraste mínimo: texto `ink` sobre `cream`/`neutral-0`, e texto branco
  sobre `plum`/`rose-500` — nunca texto `rose-300` ou `gold` sobre fundo
  claro para conteúdo essencial (contraste insuficiente).
- Alvos de toque com no mínimo 36px de altura (idealmente 44px+ para
  ações primárias, ver §2).
- Semântica correta: `<button>` para ação, `<Link>`/`<a>` para navegação
  — nunca uma `<div onClick>` fazendo esse papel.
- Detalhes completos e lacunas conhecidas (auditoria de leitor de tela
  ainda não feita) em
  [NON_FUNCTIONAL_REQUIREMENTS.md §2](./NON_FUNCTIONAL_REQUIREMENTS.md#2-acessibilidade).

## 13. Exemplos de uso

**Card de produto** (`ProductCard.tsx`) — composição correta de tokens:
imagem em `radius-lg`, badge (§8) no canto superior esquerdo em posição
absoluta, nome do produto em Títulos (15px/500), nota em Legendas
(12px/500, ícone `lucide` de estrela), preço em H3-scale porém cor
`rose-500` (`font-display`, já que preço é conteúdo de destaque mesmo
dentro de um card).

**Barra de checkout fixa** (`ProductDetail.tsx` / `carrinho/page.tsx`) —
`position: fixed`, `bottom-[64px]` (acima do `BottomNav`), fundo
`neutral-0/95` com `backdrop-blur`, borda superior `rose-100`, botões
`Button size="lg"` ocupando a largura disponível.

**Estado vazio** (`app/carrinho/page.tsx` quando não há itens) — espaço
generoso (`space-7`/48px de padding vertical), um elemento central (aqui,
excepcionalmente, um emoji afetivo em vez de ícone `lucide`), H3 para o
título do estado, Texto para a explicação, `Button variant="secondary"`
como saída.

**Filtro combinado** (`CategoryPills` + `SearchBar` na Home/Busca) —
os dois filtros operam em paralelo sobre o mesmo resultado, nunca um
substituindo o outro — ver [features/product.md](./features/product.md).

## 14. Regras obrigatórias

1. **Toda nova tela deve seguir este documento.** Se uma tela precisa de
   algo que não está aqui (uma cor, um espaçamento, um componente), o
   primeiro passo é atualizar este documento — a tela não é construída
   "por enquanto fora do padrão".
2. **Nenhum componente pode utilizar estilos próprios.** Cor, espaçamento,
   raio de borda e sombra vêm sempre de um token de `tailwind.config.js`
   listado aqui — nunca um valor arbitrário inline (`style={{...}}` com
   hex, `p-[13px]`, etc.), exceto onde este documento explicitamente
   descreve uma exceção (ex.: `space-1`/4px para gap ícone-texto).
3. **Todo componente deve reutilizar o Design System.** Antes de escrever
   um botão, badge, pill ou card novo, checar se `Button`, `ProductBadge`
   ou `TogglePill` já resolvem — duplicar estilo entre dois componentes é
   tratado como defeito, não como atalho aceitável (ver
   [ENGINEERING_GUIDELINES.md §5](./ENGINEERING_GUIDELINES.md#5-componentização)).
4. Este documento é a **referência oficial de toda a interface** da
   plataforma Love Mimos — na dúvida entre o que está implementado em
   código e o que está escrito aqui, o código está desatualizado, não o
   documento (ou vice-versa, se este documento não foi atualizado junto
   com uma mudança de código — ver
   [ENGINEERING_GUIDELINES.md §9](./ENGINEERING_GUIDELINES.md#9-documentação-obrigatória)).
