# Gravação Controlada de Produto Único (Tiny v2) + Validação do Ciclo Completo

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-v2-product-mapping.md](./tiny-v2-product-mapping.md)

## O que é

A etapa seguinte ao mapeamento: gravar **um único produto** (o
`744931523`) no catálogo real da aplicação, com segurança (pré-visualização,
proteção contra sobrescrita), e uma página que valida o ciclo completo:
**Tiny API → Mapper → Catálogo Love Mimos → Exibição no site.**

## Como gravar (você precisa rodar isso — eu não tenho seu token)

```bash
# Só relatório — nada é escrito, nunca pede confirmação
npm run write:tiny-v2-product -- 744931523

# Mostra o resumo completo, pede para digitar o ID da Tiny, só então grava
npm run write:tiny-v2-product -- 744931523 --apply

# Idem, mas sobrescreve um conflito conscientemente
npm run write:tiny-v2-product -- 744931523 --apply --force
```

Se o produto não tiver nome ou preço válido, o script recusa gravar
(`blockers`), mesmo com `--apply`. Campos obrigatórios do domínio sem
equivalente na Tiny (categoria, estoque) recebem um fallback
explicitamente reportado no terminal (`fallbacksUsed`) — nunca
silencioso.

## Segunda camada de confirmação (além do `--apply`)

Antes de qualquer escrita real, o script sempre imprime um **resumo**
(nome, SKU, preço, imagens, estoque, variações, ID da Tiny, e quais
campos serão criados/alterados) e, só então, pede que você **digite o
ID da Tiny exatamente** para confirmar. Qualquer outra coisa digitada
cancela a gravação — nada é escrito. Isso existe mesmo com `--apply`
já presente, como uma segunda barreira deliberada contra gravar o
produto errado por engano.

## Página de validação do ciclo completo

```
http://localhost:3000/dev/tiny-v2-product-validation
```

Mostra: o produto vindo da Tiny agora mesmo, o que está salvo no
catálogo (se já tiver sido gravado), as diferenças entre os dois, e uma
prévia de como apareceria no site (imagem/placeholder, preço, estoque,
variações). Se o produto ainda não foi gravado, a página avisa
claramente e mostra só o lado da Tiny.

## Segurança

- **Não sincroniza os demais produtos** — só o ID passado (ou
  `744931523` por padrão).
- **Não sobrescreve sem confirmação** — detecta produto já existente
  por `externalRef` → SKU → slug (nessa ordem); com diferença
  encontrada, recusa gravar sem `--force`.
- **Preview por padrão** — só grava com `--apply` explícito.
- **`externalRef` preservado** em produto e em cada variação.
- **Nunca altera nada na Tiny** — só leitura.

## Bug real encontrado e corrigido nesta etapa

Ao tentar rodar o script pela primeira vez (ainda sem token, só para
confirmar a estrutura), ele **quebrava com um erro completamente
diferente do esperado**: o pacote `server-only` (usado em
`tiny-v2-connection-test.ts` e outros arquivos da integração) lança
erro quando importado fora do bundler do Next.js — algo que só
acontece ao rodar via `tsx` diretamente (CLI), nunca quando o mesmo
código é usado dentro de uma página/rota do Next. Corrigido passando
`--conditions=react-server` para o `tsx` nos três scripts afetados
(`sync:tiny-product`, `test:tiny-connection`, `write:tiny-v2-product`)
— faz o `server-only` resolver para seu stub vazio em vez de lançar,
sem remover a proteção real que ele dá dentro do Next.js.

## O que foi reaproveitado (sem duplicar)

`src/lib/catalog/product-diff.ts`: `findExistingProduct`/
`diffProductFields` extraídos de `single-product-sync.ts` (o fluxo v3)
para serem compartilhados pelo novo fluxo v2 — lógica de domínio pura,
sem depender de qual fonte externa originou o produto.
`scripts/lib/serialize-catalog.ts` (já existente) também é reaproveitado.

## Arquivos novos

| Arquivo | O que é |
|---|---|
| `src/lib/catalog/product-diff.ts` | Lógica de correspondência/diff, compartilhada entre v2 e v3 |
| `src/lib/repositories/tiny/tiny-v2-product-builder.ts` | Converte o resultado do mapeamento num `Product` completo e gravável |
| `scripts/sync-tiny-v2-product.ts` | CLI de gravação controlada |
| `src/app/dev/tiny-v2-product-validation/page.tsx` | Página de validação do ciclo completo |

## Testes

`tiny-v2-product-builder.test.ts` (7) — bloqueio por falta de
nome/preço, fallback honesto para categoria/estoque/descrição
ausentes, preservação de variações com `externalRef`.

## Próxima etapa (depois de você validar este único produto)

Preparar a importação dos 15–20 produtos mais vendidos — só depois de
confirmar visualmente, nesta página, que o ciclo completo (Tiny →
Mapper → Catálogo → Site) está correto para este produto de teste.
