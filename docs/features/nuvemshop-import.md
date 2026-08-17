# Importação de Catálogo — Nuvemshop

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [PRODUCT_CATALOG_GUIDE.md](./PRODUCT_CATALOG_GUIDE.md)

Ferramenta de linha de comando para importar produtos a partir de um
export real ("Relatório de produtos") da Nuvemshop — analisada contra o
arquivo real fornecido, nenhuma coluna foi inventada.

## Como rodar

```bash
# Pré-visualização — nunca altera o catálogo
npm run import:nuvemshop -- caminho/para/export.csv

# Aplica de verdade em src/lib/data/products.ts
npm run import:nuvemshop -- caminho/para/export.csv --apply
```

Sem `--apply`, o script só lê o CSV, roda o mapeamento e a comparação
contra o catálogo atual, imprime o relatório no terminal, e escreve o
relatório completo em `import-preview/nuvemshop-report.json` (ignorado
pelo git). **Nada em `src/lib/data/products.ts` é tocado** até
`--apply` ser passado explicitamente.

## Estrutura real do arquivo

31 colunas, separador `;`, codificação ISO-8859-1. Uma linha por
**variação**, não por produto — linhas com o mesmo `Identificador URL`
pertencem ao mesmo produto; campos de produto (Nome, Categorias,
Descrição, Marca, Tags, status de publicação) só vêm preenchidos na
primeira linha do grupo.

## Mapeamento coluna → campo

| Coluna | Campo | Regra |
|---|---|---|
| `Identificador URL` | `slug` | Também usado como identificador de fallback (ver §3) |
| `Nome` | `name` | |
| `Categorias` | `categorySlug` | Ver §2 |
| `Nome da variação 1` / `Valor da variação 1` | `variants[].label` | Só a variação 1 é usada — variações 2 e 3 nunca aparecem preenchidas no arquivo real |
| `Preço` | `compareAtPrice` (quando há promoção) | "Preço" é o preço de tabela/original |
| `Preço promocional` | `price` (quando presente e menor que `Preço`) | É o preço que a cliente realmente paga |
| `Estoque` | soma → `stock` | `Product.stock` é um único número — sem suporte a estoque por variação no modelo atual, então somamos todas as variações (ver §4) |
| `SKU` | identificador principal | Ver §3 |
| `Descrição` | `description`/`shortDescription` | Contém HTML real (tags + entidades) — sanitizado para texto puro |
| `Exibir na loja` + `Visibilidade` | filtro de publicação | Só `SIM` + `Visível` são importados |
| `Marca`, `Tags`, SEO, `MPN`, `Sexo`, `Faixa etária`, `Peso/Altura/Largura/Comprimento`, `Custo`, `Código de barras`, `Frete gratis`, `Produto Físico` | — | Sem campo equivalente no modelo `Product` atual — não inventamos campos novos para acomodá-los |
| — | `images` | **Nenhuma coluna de imagem existe na planilha real** — sempre `[]`, o placeholder de marca é exibido normalmente |

## 1. Decisão: preço vs. preço promocional

Confirmado nos dados reais (`Preço: 49.90, Preço promocional: 45.90`) —
"Preço promocional" é sempre igual ou menor que "Preço". Um erro de
mapeamento na primeira versão desta ferramenta invertia os dois; foi
corrigido e testado antes de qualquer aplicação real.

## 2. Decisão: escopo de categoria (confirmada com o usuário)

A raiz da taxonomia real tem "Extensão de Cílios" (179 produtos),
"NAIL DESIGNER" (73) e "Sobrancelha" (27) — categorias que não existem
no app hoje. **Decisão confirmada**: só produtos com raiz "Extensão de
Cílios" são importados; os demais aparecem no relatório como
`ignored`, com o motivo exato.

Dentro de "Extensão de Cílios", as subcategorias mapeadas são:

| Subcategoria real | `categorySlug` |
|---|---|
| CÍLIOS | `cilios` |
| Colas e Adesivos | `colas` |
| Acessórios | `acessorios` |
| Removedores | `removedores` |
| *(raiz sem subcategoria — 35 produtos reais)* | `cilios` (fallback documentado — ver `category-mapping.ts`) |
| Retenção e Limpeza | **sem mapeamento** — vira `ignored` |

Nenhuma subcategoria real mapeia para `kits` ou `pincas` — não é um
bug, é o que os dados reais mostram.

## 3. Decisão: identificador (confirmada com o usuário)

Só **73 de 450 linhas (16%)** têm SKU preenchido. Decisão confirmada:
quando o SKU existe, ele é o identificador; quando não existe, usa-se
`Identificador URL` (+ o valor da variação, se houver variação) como
identificador alternativo. A comparação contra o catálogo atual
verifica `sku` OU `slug` — o que bater primeiro.

## 4. Limitação assumida: estoque agregado

`Product.stock` é um único número; a planilha real tem estoque por
variação. Usamos a **soma** de todas as variações como estoque do
produto — decisão registrada, não uma mudança de modelo.

## 5. Relatório

```ts
type ImportReport = {
  created: MappedProduct[];
  updated: MappedProduct[];
  variantsImported: number;
  ignored: { identifierUrl, name, reason }[];
  errors: { rowIndex, identifierUrl, message }[];
};
```

## Resultado real (arquivo fornecido, modo pré-visualização)

| | |
|---|---|
| Produtos criados | 135 |
| Produtos atualizados | 0 (catálogo mock atual não compartilha nenhum SKU/slug com o export) |
| Variações importadas | 263 |
| Linhas ignoradas | 150 (146 fora do escopo de categoria + 4 subcategoria sem mapeamento) |
| Erros | 0 |

## Testes

`src/lib/import/nuvemshop/*.test.ts` — 54 testes cobrindo parser CSV,
agrupamento, mapeamento de categoria, sanitização de HTML, todas as
regras do mapeador (escopo, identificador, preço/promoção, agregação de
estoque), e o relatório de ponta a ponta.
