# Assistente de IA — Proposta (não implementado)

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md). Este documento é uma
> **proposta de exploração**, não uma feature construída. Nada aqui existe
> no código hoje — é para orientar uma decisão futura, se e quando fizer
> sentido investir nisso.

## 1. Problema que resolveria

Lash designers frequentemente têm dúvidas de escolha, não só de catálogo:
"qual cola usar em cliente com olhos sensíveis?", "curvatura C ou D pra
volume russo fechado?", "esse removedor funciona com fio a fio?". Hoje
essas perguntas ou não são respondidas (a cliente escolhe errado) ou viram
mensagem extra pra fornecedora responder manualmente — exatamente o
atrito que o catálogo já tenta reduzir.

## 2. O que seria (conceito)

Um assistente conversacional dentro do próprio app (ou como camada sobre o
WhatsApp) que:

- Recomenda produtos com base numa pergunta em linguagem natural
  ("preciso de algo pra cliente com olho sensível" → sugere a Cola
  Sensitive, explica por quê).
- Explica diferenças entre produtos similares (ex.: fio a fio vs. volume
  russo vs. volume egípcio) usando as descrições já existentes no
  catálogo.
- Monta o carrinho a partir da conversa ("adiciona 2 caixas de 0.07 D e a
  cola sensitive") em vez da cliente navegar manualmente.
- Sempre termina com o mesmo caminho de saída do resto do app: o botão de
  finalizar pedido no WhatsApp — o assistente ajuda a decidir e montar o
  pedido, não substitui o fechamento humano da venda.

## 3. Esboço técnico (se for construído)

- **Onde rodaria**: uma rota de API interna do Next.js
  (`app/api/assistente/route.ts`) chamando a API da Anthropic
  (`@anthropic-ai/sdk` ou `fetch` direto em `api.anthropic.com`) do lado do
  servidor — a chave de API nunca fica exposta no cliente.
- **Contexto do catálogo**: o assistente precisa receber o catálogo atual
  (ou um resumo dele) como contexto — via *tool use*/function calling
  chamando `getProductsByCategory`/`searchProducts` (as mesmas funções que
  já alimentam a UI, ver [API_TINY.md](./API_TINY.md) para quando isso vier
  da Tiny), em vez de reescrever o catálogo direto no prompt.
- **Ação de montar carrinho**: o resultado do assistente precisaria emitir
  uma ação estruturada (ex.: `{ action: "add_to_cart", productId, variantId,
  quantity }`) que o front-end client-side traduz em chamadas reais ao
  `useCartStore` (`src/features/cart/store/cart-store.ts`) — o modelo nunca manipula o
  carrinho diretamente, só sugere a ação e a UI confirma com a cliente
  antes de executar.
- **Modelo**: consultar a documentação atual da Anthropic
  (`docs.claude.com`) para o modelo recomendado no momento da implementação
  — não fixar aqui um nome de modelo específico, porque a oferta muda mais
  rápido do que este documento seria atualizado.

## 4. Riscos e por que isso não é uma prioridade óbvia

- **Custo por conversa** recorrente vs. um catálogo estático que já resolve
  a maior parte dos casos de compra simples.
- **Recomendação errada de produto** tem consequência real (reação alérgica
  a cola, por exemplo) — qualquer versão disso precisaria de uma revisão
  cuidadosa de quais perguntas o assistente pode responder com confiança
  versus quando deveria dizer "fala com a equipe no WhatsApp" em vez de
  arriscar um palpite.
- **Manutenção**: um assistente mal calibrado que recomenda errado é pior
  que não ter assistente — precisaria de um processo de revisão contínua,
  não é "configurar uma vez e esquecer".

## 5. Critério para decidir se vale a pena construir

Só faz sentido priorizar isso se, na operação real (Fase 1/2 do
[ROADMAP.md](./ROADMAP.md)), aparecer um volume relevante de mensagens no
WhatsApp que são *dúvida de escolha de produto* antes da compra — não
dúvida de preço/estoque (que o catálogo já resolve) nem negociação de
frete/pagamento (que continua sendo humano por natureza).
