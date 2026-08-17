# Correção: Preço R$ 0,00 e Estoque "Esgotado" (formato aninhado)

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-v2-product-mapping.md](./tiny-v2-product-mapping.md)

## O problema relatado

Sincronização funcionando (imagens e descrição corretas), mas o
frontend mostrava R$ 0,00 e estoque esgotado. O script reportava que
a Tiny "não retornou" preço/estoque.

## Causa provável

O mapeador assumia `preco`/`estoque` sempre como número/string
direto. A própria API v3 (já confirmada neste projeto) aninha
`estoque.quantidade` — um sinal real de que a v2 pode aninhar de
forma parecida, o que faria a extração antiga falhar silenciosamente
ao tentar interpretar um objeto como número.

## Correção — só a extração, nada mais

`extractPrice()`/`extractStock()` agora tentam, nesta ordem: o valor
direto (formato plano, continua funcionando exatamente como antes)
e, se for um objeto, os campos aninhados mais prováveis:

| Campo | Nomes aninhados tentados |
|---|---|
| `preco`/`preco_promocional` | `preco`, `venda`, `valor` |
| `estoque` | `saldo`, `quantidade`, `atual`, `disponivel` |

Se nenhuma forma encontrar um número válido, o campo continua
`missing` — nunca inventa um valor.

## Testado, não presumido

- 8 testes novos cobrindo cada nome aninhado individualmente, preço
  promocional aninhado, e confirmando que a ausência genuína continua
  sendo reportada como ausente (não vira `0`).
- Simulação real com o script (`preco: { preco: 89.9 }`,
  `estoque: { saldo: 25 }`): saída confirmada `Preço: R$ 89.90` /
  `Estoque: 25`.
- Os 25 testes já existentes (formato plano) continuam passando sem
  nenhuma mudança.

## Escopo respeitado

Só a extração de `preco`/`estoque` em `tiny-v2-mapper.ts` foi
alterada.
