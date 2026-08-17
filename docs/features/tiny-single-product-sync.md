# Integração com a Tiny (fonte oficial de produtos)

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [API_TINY.md](../API_TINY.md) e
> [ARCHITECTURE_CATALOG.md](../ARCHITECTURE_CATALOG.md)

A Tiny é a fonte oficial de produtos, categorias, SKUs, preços, estoque
e imagens. A importação por CSV (Nuvemshop) passa a ser só uma
ferramenta de migração, não a fonte principal. Este documento cobre a
integração real com a Tiny — hoje validada apenas para **um produto por
vez** (prova de conceito), antes da sincronização completa.

## Camadas — comunicação vs. domínio, nunca misturadas

```
TinyIntegrationService   -- só sabe "falar com a Tiny" (HTTP, OAuth2,
(tiny-integration-        payload cru) — nunca conhece Product/Brand/
 service.ts)               categorySlug etc.
        |
        v
mapTinyProduct()          -- só sabe "traduzir" (payload cru -> Product)
(tiny-mapper.ts)             — nunca faz chamada HTTP
        |
        v
syncSingleTinyProduct()   -- só sabe "comparar contra o catálogo atual"
(single-product-sync.ts)     (conflito, diff, relatório) — nunca decide
                              sozinho o que gravar
```

`TinyIntegrationService` é construído sobre `tiny-client.ts` (OAuth2,
retry, timeout, rate-limit — já existente desde a Sprint 4/5), não uma
reimplementação — só dá um nome e uma superfície explícitos
(`getProductById`, `testAuthentication`) em vez de todo consumidor
chamar o `get<T>(path)` genérico.

## Comando 1 — diagnóstico (`npm run test:tiny-connection`)

```bash
npm run test:tiny-connection -- <idProdutoTiny>
```

Valida autenticação, busca o produto, imprime o **JSON completo e cru**
(sem nenhum mapeamento), e grava um log detalhado em
`import-preview/tiny-connection-test-{timestamp}.json`. **Nunca escreve
no catálogo** — é só para inspecionar o que a Tiny realmente devolve
(essencial para confirmar campos ainda não mapeados, como marca/peso/
dimensões — ver §"O que ainda não foi confirmado" abaixo).

## Comando 2 — sincronização controlada (`npm run sync:tiny-product`)

```bash
# Só relatório — nada é escrito
npm run sync:tiny-product -- <idProdutoTiny>

# Grava, se não houver conflito com dado já existente
npm run sync:tiny-product -- <idProdutoTiny> --apply

# Grava mesmo havendo conflito (sobrescreve de propósito)
npm run sync:tiny-product -- <idProdutoTiny> --apply --force
```

Requer `TINY_CLIENT_ID`, `TINY_CLIENT_SECRET`, `TINY_REFRESH_TOKEN`
configurados (ver `.env.example` e [API_TINY.md §2](../API_TINY.md)).

## Credenciais e permissões necessárias

| Variável | Origem |
|---|---|
| `TINY_CLIENT_ID`, `TINY_CLIENT_SECRET` | ERP Tiny → Configurações → Aplicativos → "+ novo aplicativo" |
| `TINY_REFRESH_TOKEN` | Fluxo OAuth2 manual único (login humano no navegador) |

**Permissão recomendada no app Tiny**: somente-leitura em Produtos,
Estoque e Categorias. Nenhum dos dois comandos escreve na Tiny —
"gravar no catálogo" é sempre no arquivo da própria aplicação.

## O que é importado

`GET /produtos/{id}` já retorna tudo num único payload — nome,
descrição, categoria, preço, estoque, SKU, imagens e variações — sem
N+1, diferente da sincronização de catálogo inteiro
(ver [API_TINY.md §4](../API_TINY.md)).

| Campo pedido | Mapeado? | Observação |
|---|---|---|
| Nome, descrição, categoria, preço, preço promocional, estoque, SKU, código de barras, imagens, variações | ✅ | Mesmo mapeamento de `tiny-mapper.ts`, já testado desde a Sprint 4 |
| Marca | ⚠️ pendente | Sem campo confirmado no schema documentado da Tiny |
| Peso, dimensões | ⚠️ pendente | Campo já existe no domínio (`Product.weight`/`Product.dimensions`), mas o nome real do campo na Tiny ainda não foi confirmado |

## `externalRef` — o vínculo para atualizações futuras

`Product.externalRef`/`ProductVariant.externalRef`
(`{ source: "tiny", id: "..." }`) — genérico no nome (não `tinyId`),
porque o domínio não deve depender de qual fonte externa originou o
dado (mesmo princípio da
[consolidação de domínio](../ARCHITECTURE_CATALOG.md)). Toda
sincronização futura do mesmo produto encontra esse registro pelo
`externalRef` primeiro — o método mais confiável, já que não muda mesmo
se SKU/slug forem editados manualmente depois.

## Como o "não sobrescrever sem avisar" funciona

1. O produto vindo da Tiny é comparado contra o catálogo atual —
   primeiro por `externalRef`, depois por SKU, depois por slug.
2. Se encontrar uma correspondência **e** algum campo relevante for
   diferente, o relatório mostra exatamente quais campos e os dois
   valores (atual vs. novo) — nunca decide sozinho qual valor é o certo.
3. Sem `--force`, o script recusa gravar quando há conflito — mesmo com
   `--apply`.

## Testes

- `tiny-integration-service.test.ts` (5) — auth e busca de produto cru,
  isolado de qualquer lógica de domínio.
- `single-product-sync.test.ts` (11) — busca direta por ID, falha de
  rede/produto inativo, `externalRef` em produto e variação, campos
  ausentes reportados (incluindo marca/peso/dimensões), detecção de
  conflito por `externalRef`/SKU.

## Bug real encontrado e corrigido nesta sprint

Ao construir o serializador compartilhado
(`scripts/lib/serialize-catalog.ts`), descobrimos que
`scripts/import-nuvemshop.ts` **nunca escrevia** `brandSlug`, `barcode`,
`tags` no arquivo final do catálogo, nem `attributes`/`externalRef` nas
variações — mesmo esses campos sendo mapeados corretamente antes desse
ponto. Os 96 produtos reais foram reimportados para recuperar esses
dados. `weight`/`dimensions` já foram incluídos no serializador
proativamente, para não repetir o mesmo erro quando forem mapeados.

## O que ainda não foi confirmado (aguardando credenciais reais)

Este código foi validado só com payload **simulado** (testes
automatizados) — nunca rodou contra a API real, porque não há
credenciais disponíveis neste ambiente. Antes de completar o
mapeamento de marca/peso/dimensões e partir para a sincronização
completa, é necessário:

1. Você configurar `TINY_CLIENT_ID`/`TINY_CLIENT_SECRET`/`TINY_REFRESH_TOKEN`
   (nunca colados em chat).
2. Rodar `npm run test:tiny-connection -- <id>` com um produto real e
   conferir o JSON completo — em especial as chaves de topo, para
   confirmar (ou descartar) um campo de marca/peso/dimensões.
3. Só então completar `mapTinyProduct` com os nomes de campo reais.
