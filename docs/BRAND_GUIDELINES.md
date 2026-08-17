# Diretrizes de Marca — Love Mimos

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md). Este documento
> rege o uso da marca Love Mimos em qualquer superfície — app, materiais
> de compartilhamento, favicon, redes sociais. Para os tokens de UI em
> geral (espaçamento, componentes, tipografia de interface), ver
> [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), que continua sendo a
> referência — este documento não o substitui, é específico de marca.

## 0. Nota de proveniência

**Nenhum arquivo de identidade visual (logo em PNG/SVG, manual de marca,
paleta oficial separada) foi recebido para este projeto.** Tudo abaixo
deriva da identidade já construída e documentada desde a Sprint 1 —
paleta plum/rose/gold, wordmark em Fraunces, e o motivo autoral da curva
de cílio (ver [DESIGN_SYSTEM.md §3-4](./DESIGN_SYSTEM.md)) — que é a
única identidade "oficial" que existe de fato neste projeto. Se um
arquivo de logo real (exportado por um designer) chegar depois, ele
substitui o SVG inline em `BrandMark.tsx`/`BrandLogo.tsx` sem quebrar
nenhum outro lugar do app, já que todo o resto do sistema consome esses
dois componentes, nunca um arquivo de imagem direto.

## 1. Componente oficial: `BrandLogo`

Toda renderização da marca no app passa por
`src/components/brand/BrandLogo.tsx` — nunca recriar o wordmark ou o
traço da curva inline em outro componente. Ele expõe:

| Prop | Valores | Uso |
|---|---|---|
| `variant` | `full` \| `compact` \| `icon` | `full`: lockup completo "Love Mimos Express" + curva animada. `compact`: só "Love Mimos", sem "Express", sem curva — espaços apertados. `icon`: só o traço da marca, sem texto — favicon, ícone de app, avatar. |
| `theme` | `dark` (padrão) \| `light` | `dark`: texto plum/rose, para fundos claros/`cream`. `light`: texto `cream`/rose claro, para fundos escuros (hero em plum, splash). O traço dourado (`gold`) é constante nos dois temas — é o único acento que nunca muda. |
| `size` | `sm` \| `md` \| `lg` | Mapeia para os tokens tipográficos H3/H2/H1 do Design System — nunca um tamanho de fonte arbitrário. |

O traço-mark isolado vive em `src/components/brand/BrandMark.tsx` — é o
que `variant="icon"` renderiza, e também a base do favicon/app icon (ver
§6).

## 2. Cores oficiais

Reaproveitadas integralmente do [DESIGN_SYSTEM.md §3](./DESIGN_SYSTEM.md#3-paleta-de-cores)
— não existe uma paleta "de marca" separada da paleta de UI neste
projeto, propositalmente (uma segunda paleta divergente criaria
inconsistência entre o app e qualquer material de marca).

| Papel na marca | Token | Hex |
|---|---|---|
| Superfície de marca / fundo do ícone | `plum` | `#3B0F2B` |
| Acento de marca (traço da curva, sempre) | `gold` | `#D4AF7A` |
| Texto de marca sobre fundo claro | `plum` | `#3B0F2B` |
| Texto de marca sobre fundo escuro | `cream` | `#FFFBF8` |
| Acento secundário do wordmark ("Express") | `rose-500` (tema `dark`) / `rose-300` (tema `light`) | `#C6376B` / `#EBAFC1` |

## 3. Tipografia da marca

Wordmark sempre em **Fraunces** (`font-display`), peso 600 — nunca Plus
Jakarta Sans (essa é a fonte de UI, não de marca) e nunca um peso mais
leve que 600, que enfraquece o wordmark. Tamanhos: ver `size` em §1,
sempre um dos três tokens (`text-h1`/`text-h2`/`text-lg`), nunca um
valor customizado.

## 4. Área de proteção (clear space)

Manter, ao redor do lockup `full`/`compact`, um espaço livre mínimo igual
à altura do "L" de "Love" no tamanho em uso — não encostar em bordas de
card, texto, ou outro elemento gráfico dentro dessa margem. Na prática,
os componentes que já usam `BrandLogo` (`Header`, `BrandSplash`) aplicam
isso via padding do container, não do próprio componente — o
`BrandLogo` nunca deve reservar seu próprio espaçamento externo, para
poder ser reutilizado em qualquer contexto.

## 5. Tamanhos mínimos

| Variante | Tamanho mínimo | Por quê |
|---|---|---|
| `full` | `size="sm"` (18px de altura de texto) | Abaixo disso, "Express" e a curva perdem legibilidade |
| `compact` | `size="sm"` | Mesma razão, sem a palavra extra pra compensar |
| `icon` | 16×16px (escala de favicon) | O traço foi desenhado especificamente para continuar legível nesse tamanho — ver `BrandMark.tsx` |

Nunca redimensionar o `icon` abaixo de 16px — abaixo disso os três traços
da curva colapsam visualmente.

## 6. Favicon, app icon, PWA e Open Graph

Implementados via convenções de arquivo do Next.js (geradas
automaticamente no build, sem depender de nenhuma ferramenta externa de
rasterização):

| Arquivo | Gera | Tamanho |
|---|---|---|
| `src/app/icon.tsx` | Favicon / ícone de app | 64×64 |
| `src/app/apple-icon.tsx` | Apple touch icon | 180×180 (padrão recomendado pela Apple) |
| `src/app/opengraph-image.tsx` | Preview ao compartilhar o link (WhatsApp, etc.) | 1200×630 (padrão OG) |
| `src/app/manifest.ts` | Manifest PWA ("adicionar à tela de início") | — |

**Limitação conhecida e documentada**: a imagem de Open Graph usa uma
fonte serifada genérica, não a Fraunces real. Carregar uma fonte customizada
nesse ponto exigiria buscar os bytes da fonte em tempo de build/requisição
(`fetch` para `fonts.gstatic.com`), e o ambiente onde este projeto foi
desenvolvido/validado bloqueia esse acesso de rede durante o build (mesma
restrição já documentada em
[PROJECT_VISION.md §5](./PROJECT_VISION.md#5-decisões-técnicas-e-por-quê)
para o carregamento de fontes do app em si). Em um ambiente com acesso
normal à internet, trocar `fontFamily: "serif"` em `opengraph-image.tsx`
por uma Fraunces carregada via a opção `fonts` do `ImageResponse` é uma
melhoria válida.

**`metadataBase`** em `src/app/layout.tsx` usa um domínio placeholder
(`https://lovemimos.example.com`) — **trocar pelo domínio real antes do
lançamento**, mesmo padrão de placeholder já usado para o número do
WhatsApp em `src/lib/config.ts` (ver
[DELIVERY.md](./DELIVERY.md#5-checklist-antes-de-publicar-para-clientes-reais)).
Pode ser sobrescrito via a variável de ambiente `NEXT_PUBLIC_SITE_URL`
(não é segredo — é a própria URL pública da loja, ao contrário das
credenciais da Tiny em `.env.example`).

## 7. Splash screen

Este app é aberto a partir de um link do WhatsApp (ver
[VISION.md](../VISION.md)) — não é instalado como app nativo na maioria
dos casos. Por isso, em vez de produzir a matriz completa de imagens de
splash por dispositivo que a Apple exige para PWAs instalados (o que
precisaria de arquivos exportados reais, que não temos — ver §0),
implementamos o equivalente funcional para este contexto:
`src/components/brand/BrandSplash.tsx` — uma tela de marca (fundo
`plum`, `BrandLogo` tema `light`) mostrada uma vez por sessão
(`sessionStorage`) por ~900ms antes de desaparecer, montada em
`app/layout.tsx`.

Para quem instalar o app via "adicionar à tela de início" mesmo assim, o
`manifest.ts` (§6) já fornece `background_color`/ícone suficientes para
iOS e Android renderizarem uma splash básica automática — não é uma
imagem de splash customizada por dispositivo, é o comportamento padrão
da plataforma a partir do manifest.

**Nota sobre o tempo de exibição**: os ~900ms de exibição do
`BrandSplash` não são regidos pelo teto de 250ms de
[DESIGN_SYSTEM.md §10](./DESIGN_SYSTEM.md#10-animações) — aquele teto
rege a *duração de uma transição/animação*, não quanto tempo uma tela
estática fica visível antes de iniciar sua transição de saída (que,
essa sim, dura 250ms). Mesma lógica já usada para a exceção do desenho
do logo.

## 8. Fundos permitidos

- `cream` (#FFFBF8) — fundo padrão do app, usar `BrandLogo theme="dark"`.
- `plum` (#3B0F2B) ou o gradiente `plum` → `plum-light` — usar
  `BrandLogo theme="light"`.
- `neutral-0` (branco) — usar `theme="dark"`, mesma regra do `cream`.
- **Nunca** sobre uma foto de produto ou qualquer imagem com padrão
  visual — o wordmark perde legibilidade sem um fundo sólido/gradiente
  de marca por trás.
- **Nunca** sobre `rose-500` ou `gold` sólidos — o contraste do texto
  (seja `plum` ou `cream`) fica insuficiente nesses tons intermediários.

## 9. Usos proibidos

- Recriar o wordmark ou a curva com CSS/SVG duplicado em vez de usar
  `BrandLogo`/`BrandMark` — isso é tratado como o mesmo tipo de
  duplicação de componente proibida em
  [ENGINEERING_GUIDELINES.md §5](./ENGINEERING_GUIDELINES.md#5-componentização).
- Mudar a cor do traço da curva para qualquer cor além de `gold` — é o
  único elemento que não varia entre os temas `dark`/`light` (§1),
  precisamente para continuar reconhecível em qualquer contexto.
- Usar `variant="full"` abaixo do tamanho mínimo (§5) — se o espaço é
  pequeno demais, trocar para `compact` ou `icon`, não encolher o
  `full`.
- Aplicar peso de fonte diferente de 600 ao wordmark, ou trocar
  `font-display` (Fraunces) por `font-sans` (Plus Jakarta Sans) em
  qualquer variante.
- Distorcer a proporção do `BrandMark` (esticar largura/altura
  independentemente) — sempre dimensionar via uma única prop de
  tamanho, nunca `width`/`height` divergentes.
- Colocar o `icon` sozinho em qualquer contexto que já tenha o `full`
  ou `compact` visível na mesma tela (ex.: não duplicar a marca no
  rodapé de uma tela que já tem o header com o logo) — reforça o
  princípio de interface limpa do Design System, não é regra exclusiva
  de marca.

## 10. Onde cada peça vive (referência rápida)

| O quê | Arquivo |
|---|---|
| Componente principal | `src/components/brand/BrandLogo.tsx` |
| Traço isolado (ícone) | `src/components/brand/BrandMark.tsx` |
| Splash in-app | `src/components/brand/BrandSplash.tsx` |
| Favicon / app icon | `src/app/icon.tsx`, `src/app/apple-icon.tsx` |
| Open Graph | `src/app/opengraph-image.tsx` |
| Manifest PWA | `src/app/manifest.ts` |
