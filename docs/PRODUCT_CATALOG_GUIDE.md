# Guia de Catálogo de Produtos

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [API_TINY.md](./API_TINY.md) (mapeamento técnico completo) e
> [ARCHITECTURE.md](./ARCHITECTURE.md)

Este guia é para quem for cadastrar produtos — hoje editando
`src/lib/data/products.ts` diretamente, e futuramente pela própria Tiny
ERP quando a integração real for ativada (`DATA_SOURCE=tiny`, ver
[API_TINY.md](./API_TINY.md)). O objetivo é que um produto cadastrado
hoje continue aparecendo corretamente no app quando a fonte de dados
mudar, sem precisar recadastrar nada.

## 1. Campos obrigatórios

Sem estes, o produto **não aparece no catálogo** (é descartado
silenciosamente, tanto no mock quanto na Tiny — ver
[API_TINY.md §5](./API_TINY.md#5-mapeamento-de-campos-tiny--modelos-internos)):

| Campo no app | No cadastro da Tiny (quando ativa) | Observação |
|---|---|---|
| Nome | `descricao` | Vira o nome exibido e a base do slug/URL |
| Preço | `precos.preco` | Sem preço, o produto some do catálogo |
| Situação | `situacao = "A"` (Ativo) | `"I"` (Inativo) ou `"E"` (Excluído) removem o produto do app |
| Categoria | `categoria` | Sem categoria, o produto cai em uma categoria genérica ("geral") que não tem ícone/nome amigável — sempre atribuir uma categoria real |

No mock (`src/lib/data/products.ts`), os equivalentes obrigatórios são
`name`, `price`, `categorySlug`, mais `id`, `slug`, `shortDescription`,
`description`, `stock`, `images` (pode ser um array vazio, mas o campo
precisa existir).

## 2. Campos opcionais (e o que acontece sem eles)

| Campo no app | No cadastro da Tiny | Sem ele... |
|---|---|---|
| SKU | `codigo` | Fica sem código de referência interno — recomendado preencher, mas não bloqueia nada |
| Preço promocional / badge "Promoção" | `precos.precoPromocional` | Sem preço promocional, o produto não ganha o badge "Promoção" automaticamente |
| Imagens | `anexos` (upload de fotos) | Sem fotos, o app mostra o placeholder de marca (ver §5) — nunca uma imagem quebrada |
| Estoque | `estoque.quantidade` | Sem informar, o app assume `0` — **o produto aparece como "Esgotado" e os botões de compra ficam desabilitados** (corrigido na Sprint 12: ver [GO_LIVE_REPORT.md](./GO_LIVE_REPORT.md)). Manter o estoque atualizado é importante para não esconder produtos disponíveis por engano. |
| Variações (tamanho/curvatura/cor) | `variacoes` | Sem variações, o produto é vendido como item único, sem seletor de opções |
| Avaliação (nota/número de avaliações) | — | **Não existe na Tiny.** Esse campo só é preenchido manualmente no mock hoje; produtos vindos da Tiny nunca terão nota/avaliação até que uma fonte real de avaliações seja integrada (fora de escopo atual) |
| Badge "Novo" / "Mais Vendido" | — | **Não existe na Tiny.** Só "Promoção" é derivado automaticamente (do preço promocional). "Novo" e "Mais Vendido" são hoje decisões manuais no mock — quando a Tiny for a fonte real, esses dois badges só voltam a existir se alguém definir uma regra de negócio própria para gerá-los (ex.: produtos criados nos últimos 30 dias) |

## 3. Como isso preserva compatibilidade com a Tiny

Todo produto que você cadastrar hoje, seguindo essa mesma estrutura,
migra sem esforço quando `DATA_SOURCE=tiny` for ativado — porque o
mapeador (`src/lib/repositories/tiny/tiny-mapper.ts`) já espera
exatamente esses campos, com as mesmas regras de obrigatoriedade. Não é
necessário "traduzir" nada depois; é o mesmo contrato dos dois lados.

## 4. Boas práticas de cadastro (recomendadas, não obrigatórias)

- **Nome**: claro e específico (ex.: "Cílios Volume Russo 0.07", não só
  "Cílios") — é o que aparece no card, na busca e na mensagem do
  WhatsApp.
- **Descrição curta**: uma frase, até ~60 caracteres, aparece no card do
  produto — evite repetir o nome.
- **Descrição completa**: pode ser mais longa, aparece só na página do
  produto — é o espaço para detalhar material, técnica, benefícios.
- **Categoria**: sempre uma das 6 já existentes (Cílios, Colas, Pinças,
  Removedores, Kits, Acessórios — ver `src/lib/data/categories.ts`) ou,
  se uma nova categoria for necessária, adicioná-la lá também (isso é
  edição de conteúdo, não uma mudança de arquitetura).
- **SKU**: um padrão consistente ajuda a rastrear o produto depois — o
  catálogo mock usa `LME-{CATEGORIA}-{NÚMERO}` (ex.: `LME-CIL-001`).
- **Estoque**: manter atualizado — é o que decide se o botão de comprar
  fica ativo.

## 5. Imagens: o que existe hoje

Nenhum produto (mock ou futuro Tiny) precisa de uma imagem para
aparecer corretamente — na ausência de fotos, o app sempre mostra um
placeholder ilustrado da marca (`ProductImagePlaceholder`), nunca uma
imagem quebrada ou um espaço em branco. Isso é intencional e documentado
desde as primeiras sprints: trocar por fotos reais é uma ação de
conteúdo (upload das fotos + apontar o componente para elas), não uma
mudança de código — ver [DELIVERY.md](./DELIVERY.md) e
[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

## 6. Revisão do catálogo mock atual (Sprint 13)

Os 12 produtos mock foram revisados nesta sprint quanto a consistência:
nomes, preços, categorias e descrições — todos coerentes entre si,
nenhuma categoria órfã (todas as 6 categorias em uso têm produtos, e
todo produto usa uma das 6 categorias existentes), nenhum SKU duplicado,
nenhum texto de preenchimento (placeholder/lorem ipsum). Nenhuma
correção foi necessária — o catálogo já estava consistente.
