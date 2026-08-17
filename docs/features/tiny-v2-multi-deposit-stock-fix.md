# Correção: Estoque Vazio em UM Produto Específico (múltiplos depósitos) + Ferramenta de Comparação

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-v2-price-stock-mapping-fix.md](./tiny-v2-price-stock-mapping-fix.md)

## O problema relatado

Todos os produtos sincronizam preço/estoque corretamente, exceto o
`744931523`, que fica com estoque vazio.

## Hipótese concreta (não confirmada contra o payload real)

O próprio código já previa esse caso desde a correção anterior — a
nota sobre múltiplos depósitos. A causa mais provável de um único
produto se comportar diferente da maioria: ele tem múltiplos
depósitos configurados na Tiny, e o campo `estoque` vem como um
array (um item por depósito), não um número/objeto único como a
maioria dos produtos.

## Correção aplicada

`extractStock()` agora também soma um array de depósitos:

```ts
estoque: [
  { deposito: "Principal", saldo: 15 },
  { deposito: "Filial", saldo: 10 },
]
// → stock = 25
```

Com fallback para um campo `depositos` separado no nível raiz, se
`estoque` não render nada. Um array vazio nunca é confundido com
"estoque zero real" — continua `missing`.

## Ferramenta nova: comparação lado a lado

```bash
npm run compare-tiny-products -- <idQueFunciona> <idComProblema>
```

Busca os dois produtos reais, mostra lado a lado todos os campos
relacionados a estoque/depósito, destacando com ⚠️ qualquer
diferença. Salva o JSON bruto completo dos dois em `import-preview/`.

## Testado com uma simulação real

```
npm run compare-tiny-products -- 111 744931523
```
com um produto simulado de estoque simples (`estoque: 40`) e outro
com array de depósitos — a ferramenta identificou corretamente:
```
⚠️ estoque
     #111 (funciona):     40
     #744931523 (com problema): "[array com 2 item(ns)]"
```

5 testes novos no mapeador cobrindo soma de array, nomes alternativos
(`saldo`/`quantidade`), fallback para `depositos`, array vazio não
virando estoque real, e soma correta mesmo com depósito zerado.

## Ainda depende de você

Rode `npm run compare-tiny-products -- <id-do-Misturador-de-Cola>
744931523` com seu token real — se a estrutura real bater com a
hipótese, o problema já está resolvido; se for outra coisa, a saída
da ferramenta mostra exatamente qual campo diverge.
