# Feature: Cart

> Volta para [README.md](./README.md)

## 1. O que é

O estado do que a cliente já escolheu, antes de virar mensagem no
WhatsApp. Não é um carrinho de e-commerce completo — não sincroniza entre
dispositivos, não tem etapa de "revisar endereço" ou "forma de pagamento"
(isso é combinado na conversa). O trabalho dele termina exatamente onde o
[checkout-whatsapp.md](./checkout-whatsapp.md) começa.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `store/cart-store.ts` | Fonte da verdade: array de `CartLine` (produto + variante + quantidade) em Zustand, persistido em localStorage via middleware `persist` com um `storage` próprio (ver §4 — Sprint 7). Expõe `addItem`, `removeItem`, `setQuantity`, `clear`, `hasItem`. |
| `hooks/useCartLines.ts` | Resolve cada `CartLine` (que só tem IDs) contra o catálogo (via `useProductQuery`) e devolve `CartLineWithProduct[]` já com produto, variante e `lineTotal` calculado — nenhum componente de UI faz essa junção sozinho. |
| `services/cart-service.ts` | Lógica pura de domínio: `resolveCartLines`, `computeCartTotals`, `buildCart` — testada isoladamente (`cart-service.test.ts`), sem depender de Zustand nem de React. |
| `components/CartLineItem.tsx` | Uma linha do carrinho: imagem, nome, variante, stepper de quantidade, botão de remover. |
| `components/FreeShippingBar.tsx` | Barra de progresso até `STORE_CONFIG.freeShippingThreshold` — reforço visual para aumentar o ticket médio sem ser agressivo. |
| `components/WhatsAppCheckoutButton.tsx` | O botão que efetivamente monta a mensagem e abre o WhatsApp — ver [checkout-whatsapp.md](./checkout-whatsapp.md). |

## 3. Fluxo de dados

```
useCartStore (Zustand + localStorage, com storage próprio contra JSON corrompido)
        ↓  (lines: {productId, variantId?, quantity}[])
useCartLines()  →  useProductQuery()  →  buildCart() (cart-service.ts)
        ↓
CartLineWithProduct[] + subtotal + itemCount
        ↓
app/carrinho/page.tsx → CartLineItem (lista) + WhatsAppCheckoutButton (ação final)
                       + "Continuar comprando" / "Limpar carrinho" (Sprint 7)
```

O carrinho guarda só IDs, nunca uma cópia do produto — isso é
deliberado: se o preço mudar no catálogo (ou na Tiny, quando integrada),
o carrinho sempre reflete o preço atual, nunca um preço "congelado" no
momento em que o item foi adicionado.

## 4. Decisões e por quê

- **Zustand em vez de Context API**: ver justificativa central em
  [PROJECT_VISION.md §5](../PROJECT_VISION.md#5-decisões-técnicas-e-por-quê).
  A Sprint 7 considerou introduzir um `CartProvider` (Context) explícito,
  mas como o Zustand store já é global por natureza (nenhum wrapper de
  árvore de componentes necessário) e já cobre exatamente as
  responsabilidades pedidas (adicionar/remover/alterar quantidade/limpar/
  subtotal/quantidade total/existência), um Provider adicional seria
  only boilerplate duplicado — a "infraestrutura de carrinho" pedida já
  existe nesse desenho, só precisava de reforço (ver itens abaixo).
- **`storage` customizado no `persist` (Sprint 7)**: o `createJSONStorage`
  padrão do Zustand **não captura erros de `JSON.parse`** — se
  `localStorage["love-mimos-cart"]` contiver JSON corrompido (escrita
  incompleta, adulteração manual, extensão de navegador), a inicialização
  do store lançava uma exceção não tratada. `cart-store.ts` agora define
  seu próprio objeto `storage` que faz o `JSON.parse` manualmente, dentro
  de um `try/catch`: em caso de falha, loga um aviso, limpa a chave
  corrompida, e devolve `null` — que o `persist` trata exatamente como
  "nenhum carrinho salvo ainda". Testado em `cart-store.test.ts`.
- **`hasItem` como método do store, não um hook à parte**: já que
  `addItem`/`removeItem`/etc. já vivem no store, "consultar existência"
  é mais uma leitura do mesmo estado — implementado como método
  (`get().lines.some(...)`) e também exposto como o hook `useIsInCart`
  para uso direto em componentes com re-render já escopado a esse
  produto/variação específico.
- **`useCartLines` como hook separado do store**: mantém o store "burro"
  (só IDs e quantidade) e a lógica de junção com o catálogo isolada e
  testável à parte — quando o catálogo vier da Tiny, só esse hook muda.
- **Sem confirmação antes de remover item ou limpar o carrinho**: ambas
  são ações reversíveis de baixo custo (basta adicionar de novo) — um
  modal de confirmação aqui seria fricção sem benefício real, contra o
  princípio de "reduzir cliques"
  ([ENGINEERING_GUIDELINES.md §8](../ENGINEERING_GUIDELINES.md#8-redução-de-cliques)).
- **Estado morto removido (Sprint 7)**: `isOpen`/`openCart`/`closeCart`
  existiam no store desde as primeiras sprints mas nunca foram
  consumidos por nenhum componente (confirmado por busca no código) —
  removidos para manter a superfície do store exatamente igual às
  responsabilidades reais em uso.

## 5. Casos de borda tratados

- Carrinho vazio → tela dedicada com CTA de volta pro catálogo
  (`app/carrinho/page.tsx`), não uma lista em branco.
- Item cujo produto não existe mais no catálogo (ex.: removido) →
  `resolveCartLines` (`cart-service.ts`) simplesmente descarta essa linha
  ao resolver — não quebra a tela nem mostra um item fantasma. Testado em
  `cart-service.test.ts`.
- Quantidade não pode passar do `stock` do produto (mesmo limite aplicado
  na página de detalhe).
- **Dados corrompidos no localStorage (Sprint 7)**: ver §4 — recuperação
  automática para carrinho vazio, sem quebrar a aplicação. Testado
  explicitamente em `cart-store.test.ts`.

## 6. Performance

Seletores do Zustand são escopados por responsabilidade —
`useCartCount()` só re-renderiza quando a soma de quantidades muda,
`useIsInCart()` só quando a presença daquele produto/variação específico
muda — nenhum componente assina o objeto inteiro do store à toa. A
resolução carrinho↔catálogo (`useCartLines`) é memoizada
(`useMemo`) e só recalcula quando `lines` ou o catálogo mudam.

## 7. O que essa feature não faz (ainda)

Sincronizar entre dispositivos, salvar carrinho da cliente entre visitas
em aparelhos diferentes, ou aplicar cupom de desconto — nenhum desses
está no roadmap atual (ver
[ROADMAP.md — fora de escopo](../ROADMAP.md#explicitamente-fora-de-escopo-por-enquanto)).
Favoritos, login, assistente Lumi e checkout novo foram explicitamente
mantidos fora de escopo na Sprint 7 — a infraestrutura de carrinho foi
reforçada de propósito para que essas features futuras encontrem uma
base estável (ver [SPRINT_7_REPORT.md](../SPRINT_7_REPORT.md)).
