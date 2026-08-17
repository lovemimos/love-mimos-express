# Correção: `spawnSync npx ENOENT` no Windows — subprocesso eliminado

> Volta para [PROJECT_VISION.md](../PROJECT_VISION.md) · Ver também
> [tiny-v2-write-audit.md](./tiny-v2-write-audit.md)

## Causa raiz

No Windows, o executável real do `npx` é `npx.cmd` — chamar
`execFileSync("npx", ...)` sem `shell: true` não resolve isso, e
falha com `ENOENT`. Isso quebrava a releitura do produto persistido,
feita antes num subprocesso separado (escolhido porque um `import()`
com cache-busting não forçava uma releitura real, como confirmado em
auditoria anterior).

## Correção — subprocesso eliminado, como preferido

Em vez de resolver a compatibilidade do `npx` entre sistemas
operacionais, a releitura agora **nunca executa nenhum processo
externo**: lê o texto bruto do arquivo (`fs.readFileSync`, sempre uma
leitura nova, nunca cacheada) e extrai o bloco do produto gravado por
correspondência de chaves (`{`/`}`, respeitando objetos aninhados
como `externalRef`), sem nunca importar ou executar o arquivo como
código TypeScript.

Isso não tem nenhuma dependência de sistema operacional: não há
`npx`, não há `.cmd` vs. binário, não há PATH para resolver. Funciona
identicamente em qualquer SO.

## Testado, não presumido

- Extração isolada testada contra um arquivo de amostra com objeto
  aninhado (`externalRef`) no meio do bloco do produto, e um produto
  seguinte logo depois — confirma que a contagem de chaves não vaza
  para o bloco errado.
- Simulação completa de ponta a ponta (rede substituída
  temporariamente, sem token real disponível): `AÇÃO: UPDATE` no SKU
  `1168839597`, `IMAGENS ANTES: []` → 4 URLs em `IMAGENS DEPOIS:`,
  `ID Tiny: 744931523` corretamente exibido no snapshot pós-gravação.
- Todos os arquivos alterados durante os testes restaurados e
  confirmados byte a byte idênticos ao original.

## Sobre testar no Windows especificamente

Este ambiente roda Linux — não tenho como executar literalmente num
Windows. O que posso garantir: a nova implementação não chama `npx`,
`execFileSync`, `spawnSync`, nem nenhum subprocesso — zero superfície
para o erro `ENOENT` acontecer. Preciso que você confirme rodando de
verdade na sua máquina Windows.

## Escopo respeitado

Só `scripts/sync-tiny-v2-product.ts` foi alterado.

## Comando (sem mudança na forma de usar)

```bash
npm run write:tiny-v2-product -- 744931523 --apply --force
```
