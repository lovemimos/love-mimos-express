# Relatório — Sprint 2: Catálogo Real

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [features/nuvemshop-import.md](./features/nuvemshop-import.md) e
> [ARCHITECTURE_CATALOG.md](./ARCHITECTURE_CATALOG.md)

## Números finais

| Métrica | Valor |
|---|---|
| Produtos | **96** |
| Marcas distintas | **17** |
| Variantes | **160** |
| Imagens | **0** |
| Atributos preenchidos (produto + variante) | **2** |
| Produtos sem imagem | **96** (100%) |
| Produtos sem preço | **0** |
| Produtos com estoque zero | **26** |

## Checklist

1. **Importar todos os produtos reais** — ✅ 96 produtos, todos dentro
   do escopo de categoria já validado (raiz "Extensão de Cílios",
   mapeável para uma das 7 categorias do menu). 189 linhas ficaram de
   fora, todas com motivo documentado (ver §"O que ficou de fora").
2. **Importar todas as imagens** — ❌ **Não existe nenhuma imagem para
   importar.** Confirmado com rigor de byte nesta mesma conversa: a
   planilha real não tem nenhuma coluna de URL de imagem, em nenhuma
   das 31 colunas. Os 96 produtos usam o placeholder de marca — que,
   como já documentado, nunca aparece como imagem quebrada.
3. **Importar todas as variações** — ✅ 160 variantes, 32 produtos com
   variação real. Contagem cruzada com o CSV bruto confirma: nenhuma
   variação foi descartada.
4. **Importar marcas** — ✅ 17 marcas distintas, via `brandSlug`
   (coluna `Marca`, slugificada). Nenhuma tem página/banner cadastrado
   ainda em `brands.ts` — isso é conteúdo, não faz parte desta sprint.
5. **Importar atributos** — ✅ parcial, honestamente: só `cor` tem
   fonte estruturada real na planilha (2 valores preenchidos no total:
   1 produto com cor única + 1 produto com 2 variantes de cor).
   `linha`/`técnica`/`efeito`/`curvatura`/`espessura`/`comprimento`/
   `material`/`volume` não têm coluna equivalente na Nuvemshop —
   arquitetura pronta para recebê-los, o dado não existe na fonte hoje.
6. **Corrigir inconsistências encontradas** — ✅ uma corrigida antes da
   importação: "Retenção e Limpeza" agora mapeia para a categoria
   "Higienização" (só ficou possível porque essa categoria foi criada
   na sprint anterior) — recuperou 4 produtos. Checagem de sanidade
   adicional (preço negativo, estoque negativo, preço promocional
   inconsistente, nome vazio, código de barras malformado): **0
   problemas encontrados**.
7. **Validar produtos sem imagem** — ✅ **96 de 96 (100%)**. Esperado —
   ver item 2.
8. **Validar produtos sem preço** — ✅ **0**. Todos os 96 produtos têm
   preço válido.
9. **Validar produtos sem estoque** — ✅ **26 de 96** com estoque zero
   — dado real da planilha (produtos genuinamente esgotados na
   Nuvemshop), não um erro de importação. Aparecerão como "Esgotado" no
   app, com os botões de compra desabilitados (comportamento já
   corrigido na Sprint 12).
10. **Validar URLs das imagens** — ✅ N/A, honestamente: não há URL
    nenhuma para validar (ver item 2). Nenhuma imagem quebrada é
    possível, porque nenhuma imagem é referenciada.

## O que ficou de fora (189 linhas, todas com motivo documentado)

| Motivo | Linhas |
|---|---|
| Categoria raiz fora do escopo (NAIL DESIGNER, Sobrancelha) | 146 |
| Subcategoria "Extensão de Cílios" sem nenhum sub-nível (sem dado real na fonte, confirmado com evidência de byte) | 35 |
| Subcategoria "Colas / Adesivos" (grafia legada, fora do mapeamento) | 1 |
| Categoria mista incluindo "Sobrancelha" | 7 |

Nenhum desses foi descartado por adivinhação — todos batem com as
decisões já tomadas e auditadas em conversas anteriores desta mesma
sprint de importação.

## Distribuição por categoria

`cilios`: 56 · `colas`: 22 · `acessorios`: 8 · `removedores`: 6 ·
`higienizacao`: 4 · `pincas`: 0 · `kits`: 0

`pincas` e `kits` não têm nenhum produto real nesta importação — não é
um erro, é o que a fonte de dados realmente contém (nenhuma
subcategoria da Nuvemshop mapeia para essas duas).

## Resultado de lint, testes e build

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros |
| `npm run test` | ✅ **267/267** |
| `npm run build` | ✅ compila, **113 páginas estáticas** (96 produtos + rotas do app) |

Confirmado manualmente em servidor real: Home, Busca, Carrinho,
Favoritos e um produto real, todos HTTP 200, sem erro no log do
servidor.

## O que ainda depende de conteúdo, não de código

- Fotos reais dos produtos (nenhuma existe na fonte atual).
- Cadastro de `description`/`bannerImage`/SEO das 17 marcas em
  `src/lib/data/brands.ts` (hoje só têm `name`/`slug`).
- Preenchimento de subcategoria na Nuvemshop para os 35+1 produtos sem
  subcategoria, se a loja quiser recuperá-los numa reimportação futura.
