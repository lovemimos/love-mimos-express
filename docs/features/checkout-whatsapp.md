# Feature: Checkout via WhatsApp

> Volta para [README.md](./README.md)

## 1. O que é

O único "checkout" que existe no app: montar uma mensagem de texto
formatada com os itens e o total, e abrir o WhatsApp já com essa mensagem
preenchida. Não processa pagamento, não reserva estoque, não cria pedido
em nenhum sistema — é literalmente um link `wa.me` com texto pronto. Essa
simplicidade é intencional, ver
[PROJECT_VISION.md §1](../PROJECT_VISION.md#1-o-que-é).

Não é uma pasta própria em `src/features/` porque não tem estado nem
componente exclusivo — é um serviço (`src/services/whatsapp.ts`) chamado
a partir de dois pontos de entrada diferentes.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/services/whatsapp.ts` | `buildWhatsAppOrderMessage(lines, subtotal)` monta o texto; `buildWhatsAppUrl(message)` monta o link `wa.me` com o texto codificado. Puro — não sabe de onde vieram as linhas. |
| `src/lib/config.ts` | `STORE_CONFIG.whatsappNumber` — o único lugar que precisa mudar para apontar pro número real da loja antes do lançamento (ver [DELIVERY.md](../DELIVERY.md#5-checklist-antes-de-publicar-para-clientes-reais)). |
| `features/cart/components/WhatsAppCheckoutButton.tsx` | Ponto de entrada 1: manda **todo o carrinho**. |
| `features/product/components/ProductDetail.tsx` (função `handleBuyNow`) | Ponto de entrada 2: "Comprar agora" manda **só o item atual** (com a variante/quantidade selecionada na tela), sem precisar passar pelo carrinho — reduz cliques para quem já sabe o que quer. |

## 3. Fluxo de dados

```
CartLineWithProduct[] (de useCartLines, ou montado ad-hoc em handleBuyNow)
        ↓
buildWhatsAppOrderMessage(lines, subtotal)  →  string formatada em pt-BR
        ↓
buildWhatsAppUrl(message)  →  https://wa.me/{numero}?text={mensagem codificada}
        ↓
window.open(url, "_blank")
```

Os dois pontos de entrada convergem na mesma função de montagem de
mensagem — não existem dois formatos de mensagem diferentes para manter
sincronizados.

## 4. Decisões e por quê

- **`window.open` em vez de `<a href>` direto**: permite rodar lógica
  (montar a mensagem) no momento do clique em vez de precisar recalcular
  o `href` a cada mudança de quantidade/variante.
- **Mensagem em português, sem parametrização de idioma**: a loja é para
  o mercado brasileiro; não existe (ainda) necessidade de i18n em nenhuma
  outra parte do app.
- **"Comprar agora" não passa pelo carrinho**: foi uma escolha deliberada
  de reduzir cliques para o caso de compra de item único — ver
  [ENGINEERING_GUIDELINES.md §8](../ENGINEERING_GUIDELINES.md#8-redução-de-cliques).
  Isso significa que os dois fluxos (carrinho vs. compra direta) precisam
  continuar usando a mesma função de montagem de mensagem para não
  divergir silenciosamente — qualquer mudança em `buildWhatsAppOrderMessage`
  afeta os dois.

## 5. Casos de borda tratados

- Carrinho vazio → `WhatsAppCheckoutButton` fica `disabled`, não abre um
  link com mensagem vazia.
- Caracteres especiais/emoji na mensagem → `encodeURIComponent` cuida da
  codificação da URL.

## 6. O que essa feature não faz (ainda)

Criar pedido programaticamente em algum sistema (Tiny ou outro),
confirmar entrega automática da mensagem, ou saber se a cliente realmente
enviou a mensagem depois de abrir o WhatsApp — tudo isso é fora de escopo
por design, não uma lacuna técnica. Ver
[AI_ASSISTANT.md §3](../AI_ASSISTANT.md#3-esboço-técnico-se-for-construído)
para a única proposta que tocaria nesse fluxo no futuro (e ainda assim
terminando no mesmo botão de WhatsApp).
