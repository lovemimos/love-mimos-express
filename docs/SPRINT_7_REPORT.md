# Relatório da Sprint 7 — Carrinho Persistente

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [docs/features/cart.md](./features/cart.md)

## Resumo executivo

O objetivo desta sprint não era criar um checkout — era auditar e
reforçar a infraestrutura de carrinho que já existia desde a Fase 0
(Zustand + localStorage + `cart-service.ts` puro, documentados em
`docs/ARCHITECTURE.md` e `docs/features/cart.md`). A auditoria encontrou
um bug real (JSON corrompido em localStorage podia derrubar a
inicialização do store), uma lacuna de API (nenhuma forma de consultar
se um produto já está no carrinho), estado morto nunca usado, dois
botões faltando na página do carrinho, e — mais importante — **nenhum
teste automatizado cobrindo o carrinho**, apesar de ele já existir há
várias sprints. Tudo isso foi corrigido nesta sprint, sem tocar em
arquitetura de repositórios, sem depender da Tiny, e sem criar nenhuma
das funcionalidades explicitamente fora de escopo (login, checkout novo,
pagamento, favoritos, WhatsApp novo).

**Leitura prévia**: `PROJECT_VISION.md`, `ROADMAP.md`, `DESIGN_SYSTEM.md`,
`ARCHITECTURE.md`, `ENGINEERING_GUIDELINES.md`, `CHANGELOG.md` — todos
lidos antes de qualquer alteração. `CLAUDE.md` foi procurado e **não
existe** no projeto — seguimos sem ele, como em todas as sprints
anteriores.

## Arquivos alterados

- `src/features/cart/store/cart-store.ts` — `storage` customizado
  (corrupção de dados), `hasItem`, `useIsInCart`, remoção do estado
  morto.
- `src/app/carrinho/page.tsx` — botões "Continuar comprando" e "Limpar
  carrinho".
- `docs/features/cart.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`,
  `docs/CHANGELOG.md`.

## Arquivos criados

- `src/features/cart/store/cart-store.test.ts` (13 testes)
- `src/services/cart-service.test.ts` (9 testes)
- `docs/SPRINT_7_REPORT.md`

**Nada foi criado em `CartProvider`/`CartService` como arquivos novos**
— ver decisão técnica #1 abaixo sobre por quê.

## Decisões técnicas

### 1. Não criar um `CartProvider` (Context) novo

O brief pedia um "CartProvider" responsável por adicionar/remover/
alterar quantidade/limpar/subtotal/quantidade total/consultar
existência. Essas responsabilidades **já existiam** — `useCartStore`
(Zustand) já é global por natureza (nenhum wrapper de árvore de
componentes é necessário, ao contrário de Context) e já cobria todas
essas responsabilidades exceto uma (`hasItem`, adicionada agora).
Introduzir um `CartProvider` de Context por cima do Zustand seria
boilerplate duplicado sem ganho — a "infraestrutura de carrinho"
pedida já existia nesse desenho desde a Fase 0
(ver [PROJECT_VISION.md §5](./PROJECT_VISION.md#5-decisões-técnicas-e-por-quê)
para a justificativa original de Zustand sobre Context). Interpretei o
objetivo da sprint como "a infraestrutura de carrinho precisa ser
robusta", não "precisa se chamar `CartProvider`" — e ajustei o trabalho
para reforçar o que existe em vez de duplicar sob um nome novo.

### 2. `CartService` já existia (`src/services/cart-service.ts`)

Mesma lógica do item 1: a regra de negócio (resolução de linhas,
subtotal, quantidade total) já estava centralizada e desacoplada do
Zustand desde a Sprint 3. O trabalho desta sprint foi **testá-la** (não
tinha nenhum teste) e confirmar que nenhum componente reimplementa essa
lógica por conta própria (confirmado por revisão de código).

### 3. Bug de corrupção de dados — a descoberta mais importante da sprint

`zustand/middleware`'s `createJSONStorage` chama `JSON.parse` sem
`try/catch` internamente. Confirmado experimentalmente antes de
qualquer correção:

```
SyntaxError: Expected property name or '}' in JSON at position 1
    at JSON.parse (<anonymous>)
    at parse (node_modules/zustand/middleware.js:295:21)
```

Ou seja: se `localStorage["love-mimos-cart"]` contivesse qualquer JSON
malformado, a aplicação inteira falhava ao inicializar o store, não
apenas o carrinho. Corrigido com um objeto `storage` próprio que faz o
parse manualmente dentro de `try/catch`, loga um aviso (sem dados
sensíveis — carrinho não tem nenhum dado sensível de qualquer forma),
limpa a chave corrompida, e devolve `null` (equivalente a "nenhum
carrinho salvo"). Dois testes dedicados confirmam a recuperação.

### 4. `hasItem` como método do store, não um serviço à parte

Já que é uma leitura direta do mesmo estado que `addItem`/`removeItem`
já gerenciam, implementado como `get().lines.some(...)` dentro do
próprio store — com um hook seletor (`useIsInCart`) para uso
ergonômico e escopado em componentes.

### 5. Estado morto removido

`isOpen`/`openCart`/`closeCart` existiam desde as primeiras sprints
(provavelmente um design de carrinho em drawer considerado e
abandonado em favor de uma página dedicada) mas nunca foram consumidos
por nenhum componente — confirmado por busca (`grep`) em todo o
projeto antes de remover.

## Testes

| Suite | Cobre |
|---|---|
| `cart-store.test.ts` (13) | Adição, produto repetido (incrementa, não duplica), variação diferente = linha separada, remoção, alterar quantidade, quantidade 0/negativa remove automaticamente, `hasItem`, limpeza, persistência (escrita real em localStorage), recuperação (nova instância do store lê o salvo), dois testes de recuperação de dados corrompidos |
| `cart-service.test.ts` (9) | Resolução de linha simples, produto removido do catálogo (descartado sem quebrar), priceModifier de variação (com e sem), carrinho vazio, subtotal + quantidade total agregados, snapshot completo (`buildCart`) |

**Resultado**: `npm run test` → **112/112** (22 novos desta sprint, mais
90 já existentes de sprints anteriores, todos continuam passando).

## Build e lint

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros, 0 avisos |
| `npm run build` | ✅ compila, 22 rotas |
| `npm run test` | ✅ 112/112 |

## Riscos encontrados

- **Nenhum risco novo em aberto de alta severidade.** O único risco real
  (corrupção de localStorage derrubando o app) foi corrigido e testado
  nesta própria sprint.
- **`console.warn` visível em caso de dados corrompidos**: comportamento
  intencional (task 8 pede tratamento observável), mas vale registrar
  que isso aparece nos logs do navegador da cliente se algum dia
  acontecer em produção — não é um erro silencioso, é por design.
- **Sem migração de schema versionada**: se o formato de `CartLine`
  mudar no futuro (ex.: adicionar um campo obrigatório), carrinhos
  salvos com o formato antigo não passam por nenhuma migração
  automática hoje — isso funcionaria "por acaso" enquanto os campos
  novos forem opcionais, mas merece atenção se um campo obrigatório for
  adicionado.

## Preparação confirmada para features futuras

- **Tiny**: `useCartLines`/`cart-service.ts` já resolvem contra
  `useProductQuery` (que já funciona com Mock ou Tiny) — nenhuma mudança
  necessária quando a Tiny for ativada.
- **WhatsApp**: `WhatsAppCheckoutButton` já consome `CartLineWithProduct[]`
  — reforços desta sprint não alteraram esse contrato.
- **Favoritos**: `hasItem`/`useIsInCart` (novo nesta sprint) é
  exatamente o tipo de primitiva que uma feature de favoritos também
  precisaria (consultar presença de um produto num conjunto) — o padrão
  já está estabelecido para replicar.
- **Lumi** (assistente, ainda não construído — ver
  [AI_ASSISTANT.md](./AI_ASSISTANT.md)): a proposta já previa que um
  assistente "sugere a ação, a UI confirma" via `useCartStore` — a API
  do store (`addItem`, `setQuantity`, `hasItem`) já é estável o
  suficiente para isso hoje.

## Próximos passos sugeridos

1. Se favoritos entrarem em uma sprint futura, considerar se merece um
   `useFavoritesStore` espelhando exatamente o padrão de
   `useCartStore` (incluindo o `storage` seguro contra corrupção) em vez
   de reinventar.
2. Se o carrinho precisar de um campo obrigatório novo no futuro,
   avaliar adicionar `version`/`migrate` ao `persist` do Zustand nesse
   momento (não implementado agora por não haver necessidade real
   ainda).
3. Nenhuma ação urgente pendente desta sprint — infraestrutura
   considerada estável para as próximas sprints se apoiarem.
