# Diretrizes de Engenharia — Love Mimos Platform

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md). Este documento é o
> "contrato" de como o código é escrito neste projeto — toda decisão de
> implementação deveria conseguir se justificar por uma regra daqui.

## 1. Objetivo do produto

Construir a melhor experiência de compra para Lash Designers, mobile-first,
integrada ao WhatsApp. Toda decisão prioriza, nessa ordem quando há
conflito: **experiência do usuário → simplicidade → performance → design
premium → facilidade de compra**. Na dúvida entre duas implementações,
escolher a que dá melhor experiência para quem está comprando.

## 2. Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server Components por padrão, rotas de arquivo, ISR pronta para a Fase 2 da integração Tiny |
| Linguagem | TypeScript | Contrato de dados (`Product`, `Category`, `CartLine`) é a espinha dorsal que permite trocar mock por API real sem tocar UI |
| Estilo | Tailwind CSS | Tokens de marca centralizados em `tailwind.config.js` — nunca cor fixa (ver §4) |
| Componentes de UI | Padrão shadcn/ui (`class-variance-authority` + `@radix-ui/react-slot`) | Componentes acessíveis, variantes tipadas, sem depender de uma lib de componentes pesada — variantes mapeadas para os tokens da marca, nunca hex direto |
| Animação | Framer Motion | Reservado para animações com propósito (feedback de ação, transição de lista) — ver §6 |
| Estado do carrinho | Zustand + `persist` | Estado simples, sem boilerplate de Context, persistido em localStorage |
| Dados/cache | React Query (`@tanstack/react-query`) | Os hooks de catálogo (`src/hooks/useProducts.ts`) já usam essa camada mesmo com dados mock — trocar por chamada real à Tiny é só trocar o `queryFn` (ver [API_TINY.md](./API_TINY.md)) |
| Deploy | Vercel | Caminho de menor atrito para App Router |

## 3. Arquitetura: Feature-First

```
src/
  app/            # Rotas (Next.js App Router) — só composição de página, sem lógica de negócio
  features/       # Uma pasta por domínio: product/, cart/ — components, hooks e store do domínio vivem juntos
  components/     # Compartilhado entre features: layout/ (Header, BottomNav) e ui/ (Button, primitives)
  services/       # Integrações externas — hoje só whatsapp.ts; amanhã tiny.ts
  hooks/          # Hooks compartilhados entre features (ex.: useProducts)
  lib/            # Config e fonte de dados (lib/data hoje é mock; utils genéricos como cn())
  types/          # Contrato de dados único (Product, Category, CartLine)
  utils/          # Funções puras sem estado (ex.: formatBRL)
```

**Regra de dependência**: `features/*` pode importar de `components/`,
`services/`, `hooks/`, `lib/`, `types/`, `utils/` — nunca o contrário, e
uma feature nunca importa diretamente de dentro de outra feature (ex.:
`features/cart` não importa de `features/product/components/*`; se
precisar de algo do produto, o dado já deve ter passado por `types/`).

## 4. Regra de cores: nunca fixa

Toda cor usada em `className` precisa ser um token do Tailwind já
declarado em `tailwind.config.js` (`plum`, `rose-*`, `gold`, `cream`,
`ink`, `whatsapp`). Isso vale também para variantes de componentes como o
`Button` (`src/components/ui/button.tsx`) — as variantes mapeiam para
esses tokens, nunca para um hex inline. Detalhes de cada token e quando
usar em [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## 5. Componentização

- Nunca duplicar um botão/badge/estado de loading com estilo inline
  repetido — se dois lugares parecem o mesmo componente, é o mesmo
  componente. Exemplos aplicados: `Button` (shadcn-style) substituiu
  botões ad-hoc em `WhatsAppCheckoutButton`, `ProductDetail` e no estado
  vazio do carrinho; `TogglePill` (`components/ui/toggle-pill.tsx`)
  substituiu a mesma lógica de pill ativa/inativa que estava copiada em
  `CategoryPills` e no seletor de variação do produto.
- Componentes específicos de um domínio (ex.: `ProductBadge`) vivem dentro
  de `features/<dominio>/components/`, não em `components/ui/` — só o que
  é genérico o suficiente para qualquer feature usar vive em
  `components/ui/`.

## 6. Animação: discreta e com propósito

Framer Motion é usado especificamente onde a animação comunica algo:

- Stagger de entrada no grid de produtos (`ProductGrid`) — sinaliza "isso
  é uma lista nova", não é decoração.
- Troca de estado do botão "Adicionar ao carrinho" → "Adicionado"
  (`ProductDetail`) — feedback de que a ação funcionou.
- `whileTap` no botão de finalizar pedido no WhatsApp — confirma o toque
  antes de sair para outro app.

Animações que não comunicam estado (logo se desenhando, badge do
carrinho "pulsando") continuam via `keyframes` do Tailwind
(`tailwind.config.js`) — não precisam da API de gestos do Framer Motion.
Ambas as abordagens respeitam `prefers-reduced-motion` (ver
`globals.css`).

## 7. Performance e acessibilidade — não negociáveis

> Metas mensuráveis e como cada uma é verificada vivem em
> [NON_FUNCTIONAL_REQUIREMENTS.md](./NON_FUNCTIONAL_REQUIREMENTS.md) — as
> regras abaixo são o "como fazer" do dia a dia de código.

- Toda tela roda dentro de `max-w-md`, mobile-first por padrão, nunca uma
  variante desktop separada (ver [DESIGN_SYSTEM.md §11](./DESIGN_SYSTEM.md#mobile-first-sempre)).
- Botões e controles interativos usam `focus-visible` consistente (herdado
  do `Button` e de `globals.css`) — não remover outline sem substituir por
  um indicador visível.
- Nenhuma tela nova sem responsividade testada em pelo menos a largura de
  um iPhone SE (375px) até um Android grande (~430px) — a faixa real de
  quem abre o link do WhatsApp no celular.

## 8. Redução de cliques

Toda funcionalidade nova deveria responder "isso reduz cliques até a
compra, ou adiciona um clique?". Exemplos já aplicados: busca filtra em
tempo real sem precisar de botão "buscar"; variação de produto e
quantidade ficam na mesma tela de detalhe, sem etapa extra antes de
adicionar ao carrinho.

## 9. Documentação obrigatória

Toda funcionalidade nova precisa de uma entrada em
[CHANGELOG.md](./CHANGELOG.md) e, se mudar uma decisão estrutural, uma
atualização no documento correspondente (`DESIGN_SYSTEM.md`,
`ROADMAP.md`, `API_TINY.md`, este arquivo). Código sem documentação
associada é considerado incompleto, não "pronto, só falta documentar".
