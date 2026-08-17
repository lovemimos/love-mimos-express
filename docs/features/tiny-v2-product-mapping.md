# Mapeamento Tiny v2 → Domínio (validação, temporário)

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-connection-test.md](./tiny-connection-test.md) e
> [ARCHITECTURE_CATALOG.md](../ARCHITECTURE_CATALOG.md)

## URL

```
http://localhost:3000/dev/tiny-v2-product-mapping
```

Dev-only (404 real em produção, confirmado com build de produção).
Nunca escreve no catálogo, nunca altera nada na Tiny.

## O que a página mostra

Uma tabela com o status de cada um dos 17 campos pedidos, nesta ordem
exata: nome, descrição, SKU/código, GTIN/EAN, preço, preço
promocional, estoque, unidade, categoria, marca, imagens, peso,
dimensões, NCM, status, variações, ID externo do Tiny. Cada linha
mostra:

- ✅ **Mapeado** — valor com sucesso
- ❌ **Ausente** — a Tiny não retornou nada para esse campo
- ⚠️ **Incompatível** — a Tiny retornou algo, mas não bate com o que o
  domínio espera (ex.: categoria fora das 7 conhecidas, produto
  inativo) — o valor bruto nunca é descartado, só sinalizado

Abaixo da tabela: JSON bruto e mapeado lado a lado, e três notas
dedicadas — imagens, **estoque** e variações — sobre se uma chamada
complementar à API provavelmente é necessária.

## Nível de confiança dos nomes de campo

Os nomes de campo (`codigo`, `preco`, `gtin`, `ncm`, `peso_bruto`,
`altura_embalagem`, etc.) seguem o padrão público e estável da API v2
da Tiny — mas nunca foram confirmados nesta conversa contra o payload
real deste produto. A tabela existe exatamente para essa confirmação.

## As três notas de chamada complementar

- **Imagens**: se `anexos` vier vazio, ou com itens mas sem `url`
  utilizável, a nota avisa que provavelmente é necessária uma chamada
  a um endpoint dedicado de anexos.
- **Estoque**: mesmo quando `estoque` vem preenchido, a nota alerta
  que contas com múltiplos depósitos configurados (`deposito`/
  `depositos` no payload) podem exigir uma chamada complementar a um
  endpoint de estoque dedicado para o valor confiável — isso não fica
  visível só olhando se o campo "estoque" está presente ou não.
- **Variações**: a API v2 tradicionalmente trata cada variação como
  um "produto filho" separado (ligado por `produto_pai_id`) — se
  vier vazio, ou só com IDs sem nome/grade legível, a nota avisa que
  uma consulta adicional por produto filho provavelmente é necessária.

## Testes

`tiny-v2-mapper.test.ts` (22 testes) — confirma que os 17 campos
sempre aparecem na lista de status (mapeado, ausente ou incompatível,
nunca omitidos), cada campo mapeado individualmente, categoria/status
incompatíveis sinalizados sem descartar o valor bruto, e as três notas
de chamada complementar (imagens, estoque, variações).

## O que ainda falta (próxima etapa, não incluída aqui)

- Confirmar com o payload real deste produto se os nomes de campo
  batem.
- Se imagens/estoque/variações precisarem mesmo de chamada
  complementar, implementá-las (fora de escopo desta etapa).
- Gravar de fato este único produto no catálogo — próxima etapa
  proposta, ainda não implementada.
