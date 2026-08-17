# Changelog

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md)

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [0.41.0] — 2026-08-06 — Correção: Estoque Vazio em Produto com Múltiplos Depósitos + Ferramenta de Comparação

> Todos os produtos sincronizam preço/estoque, exceto um específico.
> Hipótese concreta (já prevista desde a correção anterior): esse
> produto tem múltiplos depósitos, e `estoque` vem como array.

### Adicionado
- `extractStock()`: agora soma um array de depósitos
  (`[{saldo/quantidade}, ...]`), com fallback para um campo
  `depositos` separado — array vazio nunca vira "estoque zero"
  inventado.
- `scripts/compare-tiny-products.ts`
  (`npm run compare-tiny-products -- <id1> <id2>`): busca dois
  produtos reais e mostra lado a lado todos os campos de
  estoque/depósito, destacando diferenças — resposta direta ao
  pedido de comparar payloads brutos.
- Testes: 5 novos (soma de array, nomes alternativos, fallback para
  `depositos`, array vazio, soma com depósito zerado).

### Verificado
- Ferramenta de comparação testada com uma simulação real (produto de
  estoque simples vs. produto com array de depósitos) — identificou
  corretamente a diferença estrutural.
- `npm run lint`: 0 erros. `npm run test`: **395/395** (5 novos).
  `npm run build`: compila.
- **Hipótese ainda não confirmada contra o payload real** deste
  produto específico — depende de você rodar a ferramenta de
  comparação com seu token.

## [0.40.0] — 2026-08-06 — Correção: Preço R$ 0,00 / Estoque Esgotado (formato aninhado)

> Sincronização funcionando (imagens/descrição corretas), mas
> preço/estoque não vinham — hipótese: a Tiny v2 retorna esses campos
> aninhados, não como número direto (mesmo padrão já confirmado na
> API v3, que aninha `estoque.quantidade`).

### Corrigido
- `tiny-v2-mapper.ts`: `extractPrice()`/`extractStock()` agora
  tentam o formato plano (como antes) e, se for um objeto, os campos
  aninhados mais prováveis (`preco`/`venda`/`valor` para preço;
  `saldo`/`quantidade`/`atual`/`disponivel` para estoque) — nunca
  inventa um valor quando nenhuma forma tem um número válido.

### Adicionado
- Testes: 8 novos cobrindo cada nome aninhado, preço promocional
  aninhado, e confirmação de que ausência genuína continua sendo
  `missing`, não vira `0`.
- `docs/features/tiny-v2-price-stock-mapping-fix.md`.

### Verificado
- Os 25 testes existentes (formato plano) continuam passando sem
  nenhuma mudança — fluxo que já funcionava, preservado.
- Simulação real com o script: `preco: { preco: 89.9 }`, `estoque: {
  saldo: 25 }` → confirmado `Preço: R$ 89.90` / `Estoque: 25` na
  saída real do comando.
- `npm run lint`: 0 erros. `npm run test`: **390/390** (8 novos).
  `npm run build`: compila.
- Escopo respeitado: só a extração de preço/estoque no mapper foi
  alterada — imagens, descrição, builder, serializer, script e
  frontend não foram tocados.

## [0.39.0] — 2026-08-06 — Correção: `spawnSync npx ENOENT` no Windows — Subprocesso Eliminado

> No Windows, `npx` real é `npx.cmd` — `execFileSync("npx", ...)` sem
> `shell: true` falha com ENOENT. Em vez de corrigir a chamada,
> eliminado o subprocesso por completo, como preferido pelo usuário.

### Corrigido
- **Bug real, específico de Windows**: a releitura do produto
  persistido usava um subprocesso (`execFileSync("npx", [...])`) para
  contornar uma limitação de cache já identificada — mas isso não
  funciona no Windows sem tratamento especial de `.cmd`. Substituído
  por leitura de **texto bruto** do arquivo (`fs.readFileSync`,
  sempre fresca) + extração do bloco do produto por correspondência
  de chaves (respeitando objetos aninhados como `externalRef`) — zero
  subprocesso, zero dependência de sistema operacional.

### Verificado (testado, não presumido)
- Lógica de extração testada isoladamente contra um arquivo de
  amostra com objeto aninhado no meio do bloco e um produto seguinte
  — confirma que a extração não vaza entre blocos.
- Simulação completa de ponta a ponta repetida com a nova
  implementação: `AÇÃO: UPDATE`, SKU `1168839597`, `IMAGENS ANTES: []`
  → 4 URLs em `IMAGENS DEPOIS:`, `ID Tiny` corretamente exibido.
- Todos os arquivos de teste restaurados e confirmados byte a byte
  idênticos ao original.
- `npm run lint`: 0 erros. `npm run test`: **382/382**. `npm run
  build`: compila.
- **Não testado literalmente em Windows** (ambiente Linux) — mas a
  nova implementação não usa `npx`/`spawnSync`/`execFileSync` em
  lugar nenhum, eliminando a causa raiz por construção. Confirmação
  final depende de execução real na máquina Windows do usuário.

## [0.38.0] — 2026-08-06 — Correção: `.env.local` não carregava automaticamente no `tsx`

> Causa raiz identificada pelo usuário: `next dev`/`build`/`start`
> carregam `.env.local` por dentro (via `@next/env`); um script `tsx`
> puro não faz isso sozinho — só via variável já presente no shell,
> que se perde a cada sessão nova de terminal.

### Corrigido
- `scripts/sync-tiny-v2-product.ts`: `loadEnvConfig(process.cwd(),
  true, { info: () => {}, error: () => {} })` no topo do arquivo,
  antes de qualquer outro código — carrega `.env.local`
  automaticamente, silenciosamente (nunca imprime caminho de arquivo
  nem o token). Único arquivo alterado — mapper, builder, serializer
  e o componente de galeria não foram tocados, como pedido.

### Verificado (testado, não presumido)
- Token de teste só em `.env.local`, nenhuma variável exportada no
  shell → comando parou de dar `missing-token`, passou a tentar a
  rede de verdade (`api-error`, esperado para token inválido).
- `.env.local` com token vazio → `missing-token` continua correto.
- Simulação completa de ponta a ponta (rede substituída
  temporariamente, sem token real disponível neste ambiente): `npm
  run write:tiny-v2-product -- 744931523 --apply --force` com
  `.env.local` como única fonte do token — confirmado `AÇÃO: UPDATE`
  no SKU `1168839597`, `IMAGENS ANTES: []` → 4 URLs em `IMAGENS
  DEPOIS:`, relido do arquivo via subprocesso separado.
- Todos os arquivos de teste restaurados e confirmados byte a byte
  idênticos ao original antes de qualquer conclusão.
- `npm run lint`: 0 erros. `npm run test`: **382/382**. `npm run
  build`: compila.

## [0.37.0] — 2026-08-03 — Auditoria Completa da Gravação (create/update) + Simulação Real de Ponta a Ponta

> "Não considere sucesso apenas porque o comando terminou." Auditoria
> feita com uma simulação real (rede substituída temporariamente por
> uma resposta simulada com o SKU/ID reais), não inspeção teórica —
> todos os arquivos de teste restaurados e confirmados byte a byte
> idênticos ao original.

### Adicionado
- `scripts/sync-tiny-v2-product.ts`: mensagens explícitas no terminal
  — `AÇÃO: UPDATE`/`CREATE`, `ARQUIVO ALTERADO: <caminho absoluto>`,
  `IMAGENS ANTES: [...]`, `IMAGENS DEPOIS: [...]`,
  `FONTE LIDA PELO FRONTEND: ...` (detecta `DATA_SOURCE=tiny`
  acidental, que faria o frontend ignorar o arquivo por completo).
  Verificação explícita de ausência de duplicata para o mesmo ID Tiny.
- `docs/features/tiny-v2-write-audit.md`: auditoria completa,
  respondendo objetivamente as 10 perguntas pedidas, com evidência
  real (não presumida) para cada uma.

### Confirmado (com simulação real de ponta a ponta, não teoria)
- **1. Tipo de operação**: upsert — para SKU/externalRef já
  existentes, confirmado UPDATE, mesmo `id` interno reaproveitado,
  zero duplicata.
- **2. Critério de correspondência**: externalRef → SKU → slug
  (`src/lib/catalog/product-diff.ts`).
- **3. Arquivo alterado**: `src/lib/data/products.ts` (caminho
  absoluto confirmado no log).
- **4-8**: rodei o script de verdade com uma resposta Tiny simulada
  (4 URLs reais de exemplo) sobre um produto existente fake com o
  SKU/ID reais — `IMAGENS ANTES: []` → `IMAGENS DEPOIS:` as 4 URLs,
  confirmado relendo o arquivo via subprocesso novo.
- **9-10**: rastreado até o código — `ProductPage` →
  `catalogService` → `productRepository` (`DATA_SOURCE`, padrão
  `"mock"`) → `MockProductRepository` → mesmo arquivo
  `src/lib/data/products.ts`. Sem divergência encontrada.
- **Confirmado com servidor real**: build + `next start` + `curl` na
  URL do produto → HTTP 200, as 4 URLs de imagem presentes no HTML de
  verdade, sem `lash-1`.

### Achado real durante a auditoria
O `slug` é regenerado a partir do nome novo em cada atualização — se
o nome mudar numa sincronização, a URL do produto muda junto.
Comportamento correto, mas documentado como algo a saber.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **382/382**. `npm run
  build`: compila. Catálogo real confirmado idêntico (`diff`
  byte a byte) ao estado anterior à auditoria — nenhum artefato de
  teste restou.

## [0.36.0] — 2026-08-03 — Correção: Cache de Build Estático + Log de Verificação Antes/Depois

> Investigação exclusiva do frontend, conforme pedido: se o array
> persistido estivesse correto, mas a página continuasse sem imagens,
> a causa não estaria na sincronização.

### Corrigido
- **Bug real, confirmado com experimento reproduzível (não teoria)**:
  `/produto/[slug]/page.tsx` usa `generateStaticParams()` sem nenhum
  `revalidate` — a rota fica 100% estática depois do build, e uma
  atualização no catálogo (ex.: `write:tiny-v2-product --apply`)
  nunca aparece no site publicado sem rebuild manual. Reproduzido
  duas vezes (produto novo → 404; produto existente atualizado → HTML
  antigo servido, sem a URL nova). Corrigido com
  `export const revalidate = 60` (ISR) — validado com o mesmo
  experimento, a correção realmente resolve.

### Adicionado
- `scripts/sync-tiny-v2-product.ts`: imprime o snapshot completo (ID
  Tiny, SKU, Nome, `images[]`, quantidade) antes de gravar, e depois
  de gravar relê o produto via **subprocesso totalmente novo** — não
  do objeto em memória, e não via `import()` com cache-busting (essa
  abordagem foi testada e confirmada que NÃO força releitura real
  neste ambiente; documentado como achado real, não presumido).
  Compara e avisa se o array persistido bate com o que foi gravado.
- `docs/features/product-page-stale-cache-fix.md`.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **382/382** (sem novos —
  a correção de cache foi validada por experimento real reproduzível
  em vez de teste automatizado, e o log do script segue a convenção
  já usada para CLIs no projeto).
- `npm run build`: compila.
- Mecanismo de releitura via subprocesso testado ponta a ponta:
  confirmado que reflete mudanças reais no arquivo, diferente da
  tentativa inicial com `import()` + cache-busting, que não funcionou.

## [0.35.0] — 2026-08-03 — Correção: Validação de URL de Imagem (regressão "lash-1")

> `Failed to parse src "lash-1" on next/image` — a correção anterior
> não verificava se cada valor em `images[]` era uma URL/caminho
> válido, só se o array não estava vazio. 3 produtos mock antigos
> ainda tinham esses valores legados de placeholder.

### Corrigido
- **Bug de regressão**: `ProductImage` (e portanto `ProductCard`/
  `CartLineItem`/`ProductGallery`) agora filtra `images[]` por
  `isValidImageReference` antes de decidir foto real vs. placeholder
  — válido só se começar com `http://`, `https://`, ou `/`.
- 3 produtos mock antigos (`cilios-volume-russo-0-07`,
  `cilios-fio-a-fio-classico`, `cilios-volume-egiptico-fox-eyes`)
  ainda tinham `images: ["lash-1","lash-1b"]`/`["lash-2"]`/`["lash-3"]`
  — corrigidos para `images: []`.
- `scripts/lib/serialize-catalog.ts` normaliza `images` ao escrever o
  catálogo — defesa em profundidade contra qualquer importação/
  gravação futura persistir um valor inválido.

### Adicionado
- `src/utils/normalize-image-url.ts`:
  `isValidImageReference`/`normalizeImageUrls` — ponto único de
  validação, reaproveitado por renderização e gravação.
- Testes: 12 (`normalize-image-url.test.ts`), +3
  (`ProductImage.test.tsx`).
- `docs/features/image-url-validation-fix.md`.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **382/382** (15 novos).
  `npm run build`: compila. Servidor real confirmado: os 3 produtos
  que antes tinham valores legados carregam sem erro (HTTP 200, sem
  "Failed to parse src" no log).
- Não alterei nada na Tiny nem sincronizei outros produtos.

### Comando para atualizar só o produto 744931523
```bash
npm run write:tiny-v2-product -- 744931523 --apply --force
```

## [0.34.0] — 2026-08-03 — Correção: Renderização de Imagens Reais + Descrição HTML Sanitizada

> Produto 744931523 foi gravado com 4 imagens acessíveis (HTTP 200),
> mas o site continuava mostrando o placeholder. Causa raiz: nenhum
> componente checava se `product.images` tinha URL real.

### Corrigido
- **Bug real**: `ProductGallery`, `ProductCard` e `CartLineItem`
  renderizavam `ProductImagePlaceholder` incondicionalmente, nunca
  checando `product.images` — inofensivo enquanto todo produto era
  mock/Nuvemshop sem foto real, um bug real agora que existem URLs de
  verdade. `next/image` não era usado em lugar nenhum do projeto antes
  desta correção.
- **Bug relacionado**: `shortDescription` truncava a `description`
  (HTML sanitizado) por contagem de caracteres, podendo cortar uma
  tag no meio e produzir HTML quebrado — corrigido para derivar de
  texto sem tags.
- Interação morta da galeria (pontos que não trocavam a foto,
  documentada no próprio código desde antes) corrigida — agora troca
  de verdade quando há imagens reais.

### Confirmado sem necessidade de mudança
- `next.config.js` já tinha `images.remotePatterns` com
  `hostname: "**"` — qualquer domínio HTTPS já era permitido.

### Adicionado
- `src/components/ui/ProductImage.tsx`: decide foto real (`next/image`)
  vs. placeholder — ponto único de correção, reaproveitado por
  `ProductCard`/`CartLineItem`/`ProductGallery`.
- `src/utils/sanitize-html-for-display.ts`: sanitizador por allowlist
  (`p`/`br`/`strong`/`b`/`em`/`i`/`ul`/`ol`/`li`/`span`) para
  renderização segura de descrição com formatação — remove
  `script`/`style`/`iframe` com conteúdo, remove todos os atributos de
  toda tag, decodifica entidades. Usado em duas camadas (mapeador +
  render, defesa em profundidade).
- Testes: 4 (`ProductImage.test.tsx`), +5 (`ProductDetail.test.tsx` —
  imagem externa real, produto sem imagem, descrição HTML formatada,
  `<script>` removido, texto simples sem HTML), 13
  (`sanitize-html-for-display.test.ts`).
- `docs/features/product-image-rendering-fix.md`.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **367/367** (22 novos).
  `npm run build`: compila. Servidor de produção real confirmado:
  Home/produto/carrinho continuam OK (produtos sem foto real seguem
  mostrando o placeholder corretamente).
- Não alterei nada na Tiny nem sincronizei outros produtos.

## [0.33.0] — 2026-08-02 — Investigação e Correção: Resolução de Imagens (Tiny v2)

> Produto 744931523 foi gravado sem fotos. Investigação estrutural
> (sem acesso ao payload real) revelou um endpoint complementar já
> documentado e nunca usado, e um bug real no mapeador.

### Adicionado
- `src/lib/repositories/tiny/tiny-v2-image-scanner.ts`: varredura
  recursiva do payload inteiro por qualquer campo parecido com
  imagem — não depende de um caminho fixo.
- `TinyIntegrationService.getProductAttachments()`: implementa `GET
  /produtos/{id}/anexos` — endpoint v3 real, já documentado desde a
  Sprint 4/5 (`docs/API_TINY.md`), nunca usado até agora.
- `src/lib/repositories/tiny/tiny-v2-image-validator.ts`: valida
  acessibilidade real (sem credencial) de cada URL encontrada.
- `src/lib/repositories/tiny/tiny-v2-image-resolution.ts`: orquestra
  as quatro fontes em ordem (v2 direto → varredura → complementar v3
  → validação), sempre reporta a fonte, nunca inventa imagem.
- `/dev/tiny-v2-product-mapping`: nova seção "Resolução completa de
  imagens".
- Testes: 10 (scanner) + 6 (resolução) + 2 (`getProductAttachments`).
- `docs/features/tiny-v2-image-resolution.md`.

### Corrigido
- **Bug real**: o mapeador empurrava duas entradas de status para o
  mesmo campo `images` no caminho de fallback do scanner — quebrando
  a garantia de "um status por campo" que a tabela da página de
  validação depende. Corrigido para sempre uma única entrada.
- `TinyV2ProductPayload.anexos` agora aceita tanto o formato plano
  (`{url}`, confirmado na v3) quanto o aninhado (`{anexo:{url}}`,
  suposição original) — o plano é tentado primeiro.

### Alterado
- `scripts/sync-tiny-v2-product.ts` e `/dev/tiny-v2-product-validation`
  usam a resolução completa de imagens em vez do campo simples do
  mapeador.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **345/345** (18 novos).
  `npm run build`: compila. Ambas as páginas confirmadas 404 em
  produção. Catálogo confirmado intocado.
- **Investigação estrutural, não confirmada contra dado real** — sem
  acesso ao payload do produto 744931523 neste ambiente. Depende de
  você rodar `/dev/tiny-v2-product-mapping` para confirmar qual das
  quatro fontes realmente encontra a imagem.

## [0.32.0] — 2026-08-02 — Confirmação interativa antes de gravar + correção de bug real

> Camada final de segurança pedida: resumo completo + confirmação
> obrigatória do ID da Tiny antes de qualquer escrita. No processo,
> corrigido um bug real que quebrava todos os scripts CLI da
> integração Tiny.

### Corrigido
- **Bug real**: os scripts `sync:tiny-product`, `test:tiny-connection`
  e `write:tiny-v2-product` quebravam com um erro de módulo
  (`server-only` lançando exceção) sempre que rodados via `tsx`
  diretamente — o pacote só funciona dentro do bundler do Next.js.
  Corrigido passando `--conditions=react-server` para o `tsx` nesses
  três scripts, sem remover a proteção real do `server-only` dentro
  do Next.

### Adicionado
- `scripts/sync-tiny-v2-product.ts`: resumo completo (nome, SKU,
  preço, imagens, estoque, variações, ID da Tiny, campos a
  criar/alterar) impresso antes de qualquer escrita real, e
  confirmação interativa obrigatória — a pessoa precisa digitar o ID
  exato da Tiny para prosseguir, mesmo com `--apply` já presente.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **324/324**. `npm run
  build`: compila, 404 confirmado em produção.
- Os três scripts testados via `npm run` (não mais `npx` direto),
  confirmando que a correção do `server-only` funciona pelo caminho
  real de uso.
- Catálogo confirmado intocado — nenhuma gravação real ocorreu (sem
  token disponível neste ambiente).

## [0.31.0] — 2026-08-01 — Gravação Controlada de Produto Único (Tiny v2)

> Ciclo completo: Tiny API → Mapper → Catálogo Love Mimos → Exibição.
> Só o produto 744931523, com segurança (preview, proteção contra
> sobrescrita), antes de preparar os 15–20 produtos mais vendidos.

### Adicionado
- `src/lib/catalog/product-diff.ts`: `findExistingProduct`/
  `diffProductFields` — extraídos de `single-product-sync.ts` (v3)
  para serem compartilhados pelo novo fluxo v2, evitando duplicar a
  lógica de correspondência/diff.
- `src/lib/repositories/tiny/tiny-v2-product-builder.ts`: converte o
  relatório de mapeamento num `Product` completo — bloqueia a
  gravação se faltar nome/preço, usa fallback honesto e reportado
  (`fallbacksUsed`) para categoria/estoque/descrição ausentes.
- `scripts/sync-tiny-v2-product.ts`
  (`npm run write:tiny-v2-product`): CLI de gravação controlada —
  preview por padrão, `--apply` grava, `--force` sobrescreve
  conflito conscientemente.
- `/dev/tiny-v2-product-validation`: página de validação do ciclo
  completo — Tiny agora vs. catálogo salvo, diferenças, prévia de
  exibição no site (imagem/placeholder, preço, estoque, variações).
- Testes: 7 em `tiny-v2-product-builder.test.ts`.
- `docs/features/tiny-v2-single-product-write.md`.

### Alterado
- `single-product-sync.ts` (v3) atualizado para usar o módulo de
  diff compartilhado, removendo a duplicação que existia antes.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **324/324** (7 novos).
  `npm run build`: compila. `/dev/tiny-v2-product-validation`
  confirmado 404 em produção com servidor real.
- Catálogo confirmado intocado (nenhum produto com `externalRef` da
  Tiny ainda) — a gravação real depende de você rodar o script
  localmente com seu token.

## [0.30.0] — 2026-08-01 — Tabela explícita de status para os 17 campos + nota de estoque

> Reestruturação a pedido: em vez de três listas soltas
> (encontrados/ausentes/incompatíveis), a página agora mostra uma
> única tabela com o status de cada um dos 17 campos nomeados, na
> ordem exata pedida. Adicionada também a nota sobre estoque, que
> faltava.

### Alterado
- `tiny-v2-mapper.ts`: reestruturado — `fieldStatuses: FieldStatus[]`
  substitui `foundFields`/`missingFields`/`incompatibleFields`; cada
  um dos 17 campos sempre aparece exatamente uma vez, com
  `status: "mapped" | "missing" | "incompatible"`.
- Nova `stockNote`: mesmo quando "estoque" vem preenchido, avisa que
  contas com múltiplos depósitos podem exigir uma chamada
  complementar a um endpoint de estoque dedicado — reconhecendo que
  presença do campo não é o mesmo que confiabilidade do valor.
- `/dev/tiny-v2-product-mapping`: reescrita com tabela de status
  ordenada (nome, descrição, SKU/código, GTIN/EAN, preço, preço
  promocional, estoque, unidade, categoria, marca, imagens, peso,
  dimensões, NCM, status, variações, ID externo) + 3 notas de chamada
  complementar (imagens, estoque, variações).
- Testes: 22 em `tiny-v2-mapper.test.ts` (reescritos para a nova
  estrutura, incluindo confirmação de que todos os 17 campos sempre
  aparecem, e os dois cenários da nota de estoque).

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **317/317**. `npm run
  build`: compila. `/dev/tiny-v2-product-mapping` confirmado 404 em
  produção com servidor real.

## [0.29.0] — 2026-08-01 — Mapeamento Tiny v2 → Domínio (validação)

> Próxima etapa após validar a conexão: transformar o produto real
> 744931523 num `Product` do domínio Love Mimos — sem gravar nada
> ainda. Página de validação lado a lado (bruto | mapeado | ausente).

### Adicionado
- `Product.unit`, `Product.ncm`: campos de domínio legítimos
  adicionados (unidade de medida/venda, classificação fiscal
  brasileira).
- `src/lib/repositories/tiny/tiny-v2-mapper.ts`: mapeador puro
  (payload v2 bruto → `Product`), separado do mapeador v3
  (`tiny-mapper.ts`) por serem esquemas genuinamente diferentes.
  Mapeia todos os 15 campos pedidos, preserva `externalRef` em
  produto e cada variação, e relata explicitamente campos ausentes,
  incompatíveis (ex.: categoria fora das 7 conhecidas, produto
  inativo), e se imagens/variações parecem precisar de chamada
  complementar.
- `/dev/tiny-v2-product-mapping`: página de validação, dev-only —
  dados brutos e mapeados lado a lado, campos ausentes/incompatíveis
  listados. Nunca escreve no catálogo.
- Testes: 20 em `tiny-v2-mapper.test.ts`.
- `docs/features/tiny-v2-product-mapping.md`.

### Honestidade sobre confiança dos nomes de campo
Os nomes de campo da Tiny v2 usados (`codigo`, `gtin`, `ncm`,
`peso_bruto`, `altura_embalagem`, etc.) seguem o padrão público e
estável da API v2 — mas não foram confirmados nesta conversa contra o
payload real deste produto. A página existe exatamente para essa
confirmação.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **315/315** (20 novos).
  `npm run build`: compila. `/dev/tiny-v2-product-mapping` confirmado
  404 em produção com servidor real.

## [0.28.0] — 2026-08-01 — Rota de API equivalente para o teste de conexão

> Correção de expectativa: a rota original era só uma página
> (`/dev/tiny-connection-test`); adicionada uma rota de API
> equivalente para quem esperava um endpoint REST.

### Adicionado
- `GET /api/tiny/test-product`: mesma lógica de
  `testTinyV2Connection`, resposta em JSON, mesmo status HTTP
  correspondente a cada tipo de resultado (401 auth, 403 permissão,
  404 não encontrado, etc.). Dev-only — 404 real em produção,
  confirmado com build de produção.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **295/295** (sem novos —
  rota de API sem teste dedicado, mesma convenção do resto do
  projeto: nenhuma rota de API tem teste próprio, testada via a
  lógica que consome). `npm run build`: compila, ambas as rotas
  (`/dev/tiny-connection-test` e `/api/tiny/test-product`) confirmadas
  200 em dev e 404 em produção com servidor real.

## [0.27.0] — 2026-07-29 — Teste de Conexão Temporário — Tiny API v2

> `TINY_API_TOKEN` configurado é da API v2 (token estático), diferente
> da integração v3/OAuth2 já existente — rota isolada, temporária,
> só para validar essa conexão específica com o produto #744931523.

### Adicionado
- `src/lib/repositories/tiny/tiny-v2-connection-test.ts`: lógica pura,
  isolada da integração v3 — valida presença do token, chama
  `POST /api2/produto.obter.php`, classifica erros (autenticação,
  permissão, não encontrado, erro genérico) sem inventar significado
  para códigos não confirmados.
- `/dev/tiny-connection-test`: página temporária, dev-only (404 real em
  produção, confirmado com build de produção), Server Component — o
  token nunca chega ao navegador.
- `TINY_API_TOKEN` documentado em `.env.example`, deixando claro que é
  diferente das credenciais v3 já existentes.
- Testes: 11 em `tiny-v2-connection-test.test.ts`, incluindo
  confirmação explícita de que o token nunca aparece em nenhuma
  mensagem de erro.
- `docs/features/tiny-connection-test.md`.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **295/295** (11 novos).
  `npm run build`: compila. Confirmado com servidor de produção real:
  `/dev/tiny-connection-test` → HTTP 404.
- Não executado contra a API real (sem token disponível neste
  ambiente) — validado só com `fetch` mockado.

## [0.26.0] — 2026-07-29 — TinyIntegrationService + comando de diagnóstico

> A Tiny passa a ser a fonte oficial de produtos/categorias/SKUs/preços/
> estoque/imagens; CSV vira ferramenta de migração. Etapa 1-3 pedidas:
> serviço de integração desacoplado, comando de teste, mapper estendido.

### Adicionado
- `TinyIntegrationService` (`tiny-integration-service.ts`): camada
  dedicada e desacoplada de comunicação com a Tiny — só
  `testAuthentication()`/`getProductById()`, sempre payload cru, nunca
  mapeamento de domínio. Construída sobre `tiny-client.ts` existente,
  não uma reimplementação.
- `npm run test:tiny-connection -- <id>`: comando de diagnóstico —
  valida autenticação, imprime o JSON completo retornado pela Tiny,
  grava log detalhado em `import-preview/`. Nunca escreve no catálogo.
- `Product.weight`, `Product.dimensions`: campos de domínio adicionados
  (peso em kg, dimensões em cm) — nomes de campo na Tiny ainda não
  confirmados, então ficam sem popular até validação com payload real.
- Testes: 5 em `tiny-integration-service.test.ts`, +1 em
  `single-product-sync.test.ts` (peso/dimensões pendentes).

### Alterado
- `single-product-sync.ts` agora chama `TinyIntegrationService` em vez
  de `tinyClient` diretamente — reforça a separação comunicação/domínio.
- `scripts/lib/serialize-catalog.ts`: passa a serializar
  `weight`/`dimensions` proativamente, para não repetir o bug de campo
  perdido silenciosamente (ver Sprint anterior).
- `docs/features/tiny-single-product-sync.md` reescrito para refletir
  as duas camadas/comandos.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **284/284** (6 novos).
  `npm run build`: compila.
- **Ainda não executado contra a API real** — sem credenciais
  disponíveis neste ambiente; marca/peso/dimensões continuam pendentes
  de confirmação via `npm run test:tiny-connection` com um produto real.

## [0.25.0] — 2026-07-28 — Prova de Conceito: Sincronização de Produto Único (Tiny)

> Mudança de prioridade: a Tiny passa a ser a fonte oficial de produtos.
> Antes de um painel administrativo completo, uma prova de conceito
> controlada — um produto por vez, com relatório e proteção contra
> sobrescrita silenciosa.

### Adicionado
- `Product.externalRef`/`ProductVariant.externalRef`
  (`{ source, id }`): referência genérica (não `tinyId`) ao registro na
  fonte externa, para sincronizações futuras encontrarem "a mesma
  coisa" de novo em vez de duplicar.
- `src/lib/repositories/tiny/single-product-sync.ts`: busca um produto
  por ID direto (`GET /produtos/{id}`), mapeia, e compara contra o
  catálogo atual (por `externalRef`, depois SKU, depois slug) —
  relatório completo de campos importados, campos ausentes na Tiny
  (com nota honesta sobre marca — sem campo confirmado), e conflitos
  com dado já existente.
- `scripts/sync-tiny-product.ts` (`npm run sync:tiny-product`): CLI —
  pré-visualização por padrão, `--apply` grava, `--force` sobrescreve
  conflito conscientemente.
- `scripts/lib/serialize-catalog.ts`: serializador do catálogo
  extraído e compartilhado entre os dois scripts de importação.
- Testes: 10 em `single-product-sync.test.ts` (payload Tiny mockado).
- `docs/features/tiny-single-product-sync.md`.

### Corrigido
- **Bug real**: o importador Nuvemshop nunca escrevia `brandSlug`,
  `barcode`, `tags` no arquivo final do catálogo, nem
  `attributes`/`externalRef` nas variações — só descoberto ao extrair
  o serializador para reutilização. Os 96 produtos reais foram
  reimportados para recuperar os dados perdidos.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **278/278** (10 novos).
  `npm run build`: compila.
- **Não executado contra a API real da Tiny** — sem credenciais
  disponíveis neste ambiente; validado só com payload simulado.

## [0.24.0] — 2026-07-28 — Sprint 2: Catálogo Real

> Catálogo mock (12 produtos) substituído pelo catálogo real importado
> da Nuvemshop (96 produtos) — mesmo pipeline consolidado na Sprint de
> Arquitetura do Catálogo. Sem novas funcionalidades.

### Alterado
- `src/lib/data/products.ts`: 96 produtos reais (antes: 12 mock),
  gerado por `npm run import:nuvemshop -- <csv> --apply`.
- `src/lib/import/nuvemshop/nuvemshop-category-mapping.ts`: adicionado
  o mapeamento "Retenção e Limpeza" → `higienizacao` — só ficou
  possível porque a categoria "Higienização" foi criada na sprint
  anterior; recupera 4 produtos que antes não tinham destino válido.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **267/267**. `npm run build`:
  compila, 113 páginas estáticas (96 produtos + rotas do app).
- Servidor real testado manualmente: Home, Busca, Carrinho, Favoritos e
  um produto real, todos HTTP 200, sem erro no log.
- Checklist de validação completo — ver
  [SPRINT_2_CATALOGO_REAL_REPORT.md](./SPRINT_2_CATALOGO_REAL_REPORT.md).

## [0.23.0] — 2026-07-28 — Sprint de Arquitetura do Catálogo

> Consolidação de domínio: Categoria → Subcategoria substituída por
> Categoria Principal (7 itens) + `Brand` (entidade própria) + facetas
> abertas. Sem novas funcionalidades — auditoria e correção do que já
> tinha sido combinado, mas ficou incompleto numa interrupção anterior.

### Adicionado
- `Brand` (tipo + `src/lib/data/brands.ts`): entidade própria com
  `description`/`bannerImage`/`seoTitle`/`seoDescription`, preparada
  para página de marca futura.
- `Product.brandSlug`, `Product.barcode`, `Product.manufacturer`,
  `Product.tags`, `Product.attributes` (facetas abertas).
- `ProductVariant.attributes` — permite que uma variante carregue seu
  próprio valor de faceta (ex.: cor), quando a variação é a própria
  faceta.
- `src/lib/facets/registry.ts`: `FACET_REGISTRY` com 9 facetas (linha,
  técnica, efeito, curvatura, espessura, comprimento, cor, material,
  volume).
- `src/lib/facets/discover.ts`: `discoverFacetValues`/`resolveCatalogSlug`
  — descoberta de valores de faceta existentes e resolução de slug de
  URL (marca primeiro, depois faceta genérica).
- `src/utils/slugify.ts`: utilitário compartilhado, extraído de
  `tiny-mapper.ts` (que tinha sua própria cópia local).
- `docs/ARCHITECTURE_CATALOG.md`: documento oficial da arquitetura do
  catálogo (diagrama, decisões, SOLID/Clean Architecture).
- `docs/features/faceted-catalog.md`: guia prático de uso — corrige
  referências a esse arquivo que já existiam no código sem o arquivo
  nunca ter sido criado.
- Testes: 24 em `mapper.test.ts` (marca→brandSlug, cor única vs.
  multi-variante, barcode, tags), 6 em `product-query.test.ts`
  (facetas produto/variante, brandSlug, tags).

### Corrigido
- **Bug real de perda de dados**: produtos com múltiplas cores reais
  tinham a cor apagada do produto e nunca escrita na variante — a
  informação desaparecia por completo. Corrigido: vai para
  `variants[].attributes.cor`.
- **Bug relacionado**: um produto de uma cor só (uma única linha) era
  incorretamente tratado como "multi-variante" pela mesma lógica —
  corrigido para exigir mais de uma linha real.
- Filtro de faceta (`applyProductQuery`) só considerava o produto,
  nunca as variantes — quebrava exatamente o caso (multi-cor) que a
  arquitetura foi desenhada para resolver.
- Comentário em `Product.manufacturer` citava "Nuvemshop" dentro do
  arquivo de domínio (`src/types/index.ts`) — violava a regra de nomes
  representarem o negócio, não a origem dos dados.
- `tiny-mapper.ts`: `gtin` (código de barras, campo real e já
  documentado em `API_TINY.md`) nunca tinha sido mapeado para
  `barcode` — completado.

### Alterado
- `src/lib/data/categories.ts`: menu de 7 categorias (adicionado
  "Higienização"); `CategoryIcon.tsx` ganhou o ícone `Droplets`.
- Importador Nuvemshop: `mapper.ts` popula `brandSlug`/`barcode`/`tags`
  a partir de colunas reais; `marca` não é mais tratada como atributo
  genérico.
- `category-mapping.ts` renomeado para `nuvemshop-category-mapping.ts`
  — deixa explícito que é tradução de import, não parte do domínio.
- `src/app/api/products/route.ts`: novos parâmetros
  `atributo_{chave}`, `precoMin`, `precoMax`.
- `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` atualizados.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **266/266**. `npm run build`:
  compila.
- Auditoria completa contra os princípios pedidos (domínio independente
  de fonte de dados, isolamento de código específico, nomenclatura,
  duplicação, acoplamento, SOLID/Clean Architecture) — ver
  `ARCHITECTURE_CATALOG.md §7`.

### Escopo explicitamente não incluído nesta sprint
Rota de SEO pré-filtrada, UI de filtros facetados, página de marca com
banner — arquitetura pronta para receber, UI não construída (instrução
explícita: sem novas funcionalidades nesta etapa).

## [0.22.0] — 2026-07-27 — Sprint 13: Implantação do MVP

> Preparação para operar com produtos reais — sem funcionalidades,
> arquitetura, IA, Tiny ou componentes novos. Só catálogo, documentação
> e conteúdo.

### Adicionado
- `docs/PRODUCT_CATALOG_GUIDE.md`: campos obrigatórios/opcionais do
  catálogo, e como cadastrar produtos na Tiny para compatibilidade com
  o app (mesmo contrato dos dois lados, sem retrabalho na migração).
- `docs/PRODUCTION_CHECKLIST.md`: checklist operacional priorizado
  (🔴 bloqueia / 🟡 recomendado / 🔵 fora de escopo) — WhatsApp,
  domínio, variáveis de ambiente, Tiny, imagens, banners, favicon, SEO,
  testes finais.

### Alterado
- `src/lib/config.ts`: comentário do placeholder de WhatsApp reforçado
  com exemplo concreto de formato e aviso explícito — é o único item
  que bloqueia o lançamento real (ver `GO_LIVE_REPORT.md`).
- `docs/DELIVERY.md`: números desatualizados (4 telas, 18 páginas —
  datavam de antes da Sprint 6) corrigidos; checklist de pré-lançamento
  substituído por um ponteiro para `PRODUCTION_CHECKLIST.md`, evitando
  duplicação.

### Revisado (sem alteração necessária)
- **Catálogo mock**: 12 produtos, nomes/preços/categorias/descrições/SKUs
  revisados quanto a consistência — nenhuma categoria órfã, nenhum SKU
  duplicado, nenhum texto de preenchimento. Nenhuma correção necessária.
- **Mensagens ao usuário**: busca por texto técnico/temporário no
  conteúdo voltado à cliente — nenhum encontrado.
- **Estados vazios**: já usam `EmptyState` compartilhado (Sprint 11)
  com mensagens amigáveis — confirmado, sem alteração.
- **Imagens padrão**: ícones de categoria e placeholder de produto já
  têm fallback seguro — confirmado que nenhuma imagem quebrada pode
  aparecer.

### Verificado
- `npm run lint`, `npm run test`, `npm run build` — ver
  [SPRINT_13_REPORT.md](./SPRINT_13_REPORT.md) para os números exatos.

## [0.21.0] — 2026-07-27 — Sprint 12: Go Live (Preparação para Produção)

> Auditoria completa como se fosse uma cliente de primeira vez.
> Nenhuma funcionalidade, arquitetura, IA ou integração nova — só
> correção de problemas que impedem o uso real da plataforma.

### Corrigido
- **Bug crítico**: produto esgotado (`stock <= 0`) podia ser adicionado
  ao carrinho e comprado — nenhum botão era desabilitado. Corrigido em
  `ProductDetail.tsx`: "Adicionar ao carrinho" e "Comprar agora"
  desabilitados quando esgotado, aviso "Produto esgotado" substitui o
  seletor de quantidade, e `handleAddToCart`/`handleBuyNow` têm uma
  guarda extra (defesa em profundidade) contra o clique mesmo que o
  estado `disabled` seja contornado. Confirmado com um teste dirigido
  (estoque de um produto real zerado temporariamente, comportamento
  validado, dado revertido — confirmado por diff que o arquivo voltou
  idêntico ao original) e 4 testes automatizados novos.

### Adicionado
- `src/features/product/components/ProductDetail.test.tsx` (4 testes)
  — cobre o bug crítico acima, para que nunca regrida silenciosamente.
- `docs/GO_LIVE_REPORT.md`: auditoria completa de todas as telas/fluxos,
  classificados como prontos/recomendado corrigir/impede lançamento.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **199/199** (4 novos).
  `npm run build`: compila, 24 rotas.
- Navegação manual por todas as rotas (Home, categorias, busca, produto,
  favoritos, carrinho, 404) sem erro no log do servidor.
- Revisão de código não encontrou links quebrados, botões sem ação
  (além do já corrigido acima), ou texto temporário no conteúdo voltado
  à cliente.

### Avaliação de prontidão
**Nível de prontidão do MVP: 8/10** — ver
[GO_LIVE_REPORT.md](./GO_LIVE_REPORT.md) para a justificativa completa.
Único item que impede o lançamento real: número de WhatsApp ainda é
placeholder (configuração, não bug de código).

## [0.20.0] — 2026-07-27 — Sprint 11: MVP Utilizável

> Mudança de prioridade: a partir desta sprint o foco deixa de ser
> arquitetura e passa a ser fechar o produto. Sprint de auditoria e
> correção, não de novas funcionalidades — sem IA, login, backend,
> analytics real ou integração Tiny.

### Corrigido
- `window.open` sem tratamento de erro em dois lugares (Carrinho e
  "Comprar agora") — se o popup fosse bloqueado, o botão falhava
  silenciosamente. Centralizado em `tryOpenWhatsApp()`
  (`src/services/whatsapp.ts`), com `WhatsAppFallbackNotice` mostrando
  um link manual quando a abertura automática falha.
- Mensagem do WhatsApp incompleta: não incluía observação, nome do
  cliente, link do app, nem "Subtotal" separado do "Total".
  `buildWhatsAppOrderMessage` agora aceita `customerName`/`note`
  opcionais e inclui o link do app quando `NEXT_PUBLIC_SITE_URL` está
  configurado de verdade.
- Botão "Voltar" (`BackHeader`) falhava silenciosamente quando não havia
  histórico de navegação — caso comum, já que o app é aberto
  principalmente via link direto do WhatsApp. Agora cai para `/` quando
  `window.history.length <= 1`.
- Nenhuma página 404 customizada existia — criada `src/app/not-found.tsx`.
  Durante a criação, corrigido um bug de build real: `Button asChild`
  (Radix `Slot`) quebrava a geração da rota especial `_not-found`.
- Botão morto na galeria de produto: os pontos de navegação mudavam
  estado sem nenhuma imagem diferente ser exibida. Substituídos por um
  indicador estático honesto da quantidade de fotos.
- Seção "Recomendado para Você" da Home duplicava conteúdo de "Mais
  Vendidos"/"Novidades" para visitantes sem favoritos/carrinho (o caso
  mais comum) — prioridade do `homeRecommendationProvider` ajustada
  para só usar sinais pessoais.

### Adicionado
- Campos opcionais "Seu nome"/"Observação" na tela do Carrinho
  (estado local, sem persistência).
- `src/components/ui/EmptyState.tsx`: extraído do markup duplicado
  entre os estados vazios do Carrinho e dos Favoritos.
- `src/components/ui/WhatsAppFallbackNotice.tsx`.
- `src/services/whatsapp.test.ts` (17 testes) — o arquivo não tinha
  nenhuma cobertura antes desta sprint.
- `docs/MVP_CHECKLIST.md`, `docs/SPRINT_11_REPORT.md`.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **194/194** (17 novos).
  `npm run build`: compila, 24 rotas.
- Confirmado manualmente (servidor real): todas as rotas respondem
  corretamente, sem erro no log do servidor.

## [0.19.0] — 2026-07-26 — Sprint 10: Recommendation Engine

> Escopo: construir um motor de recomendações desacoplado, baseado em
> estratégias — **sem IA**. Nenhuma integração Tiny/OpenAI, sem login,
> sem backend. Carrinho e Favoritos não foram alterados — recomendações
> só leem seus stores via seletor público já existente.

### Adicionado
- `src/services/recommendations/`: reestruturado da Sprint 9 (que só
  tinha `RecommendationStrategy`/`RecommendationProvider` como
  arquitetura, sem estratégias reais nem consumidor) para uma pasta
  completa:
  - `types.ts`: `RecommendationContext`, `RecommendationStrategy` (agora
    com `isApplicable()`), `RecommendationResult`.
  - `recommendation-engine.ts`: `RecommendationEngine` — registro de
    estratégias, executa qualquer uma por nome.
  - `recommendation-provider.ts`: `RecommendationProvider` — seleciona
    automaticamente a primeira estratégia aplicável de uma lista de
    prioridade.
  - `strategies/`: `RelatedProductsStrategy`, `CompleteKitStrategy`,
    `BestSellerStrategy`, `NewestProductsStrategy`,
    `FavoriteBasedStrategy`, `CartBasedStrategy`.
  - `index.ts`: composição — 1 engine, 3 providers pré-configurados
    (Home/Produto/Carrinho), cada um só com prioridade diferente.
- `src/lib/data/kit-pairings.ts`: tabela mock de categorias
  complementares (ex.: cílios → cola) — documentada como regra de
  merchandising, não dados reais de "comprados juntos".
- `src/features/recommendations/`: `RecommendationSection.tsx` (único
  componente usado nas 3 telas), `RecommendationCarousel.tsx`
  (reaproveita `HomeCarousel`+`ProductCard`, sem duplicar), hooks
  `useRecommendationContext`, `useFullCatalog`, `useRecommendations`.
- `src/lib/analytics.ts`: `recommendation_view`/`recommendation_click`
  (disparando de verdade) e `recommendation_add_to_cart`/
  `recommendation_favorite` (definidos como estrutura — nunca
  disparados, já que exigiriam tocar em Carrinho/Favoritos).
- Testes: `strategies.test.ts` (23 — as 6 estratégias),
  `recommendation-engine.test.ts` (6), `recommendation-provider.test.ts`
  (5), `RecommendationSection.test.tsx` (4).

### Alterado
- `src/app/page.tsx`, `src/features/product/components/ProductDetail.tsx`,
  `src/app/carrinho/page.tsx`: cada um ganhou uma linha de
  `<RecommendationSection provider={...} .../>` — puramente aditivo,
  nenhuma lógica de negócio existente tocada em nenhum dos três.

### Removido
- `src/services/recommendation-service.ts` (Sprint 9, arquitetura sem
  consumidor) — confirmado por busca que nada o importava; substituído
  integralmente pela pasta `src/services/recommendations/`.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **178/178** (28 novos).
  `npm run build`: compila, 23 rotas.
- Confirmado manualmente (servidor real): `/produto/cilios-volume-russo-0-07`
  mostra "Você também pode gostar"; Home/Carrinho/Produto respondem
  200 sem erro no log do servidor.

### Documentação
- `docs/features/recommendations.md` (novo), `docs/ARCHITECTURE.md`
  (nova seção 10), `docs/ROADMAP.md` (nova Fase 2E).

## [0.18.0] — 2026-07-26 — Sprint 9: Home Inteligente

> Escopo: decompor a Home em seções modulares e preparar a
> infraestrutura visual/arquitetural para IA futura (Lumi). **Sem
> implementação de IA** — só arquitetura. Sem login, backend ou
> integrações externas. Nenhum componente existente foi removido;
> `CategoryPills` e o grid de catálogo continuam exatamente como
> estavam, agora complementados por novas seções.

### Adicionado
- `src/features/home/components/`: `HomeSection` (política central de
  carregando/erro/vazio/não-renderização), `HomeSectionTitle`,
  `HomeCarousel` (genérico), `HomeHero` (multi-banner, tema dark/light),
  `HomeContinueShopping`, `HomeFavorites`, `HomeBadgeSection` (lógica
  compartilhada) com `HomeBestSellers`/`HomeNewProducts` como wrappers
  finos, `HomeCategories` (vitrine visual com CTA para `/busca`).
- `HeroBanner` (tipo, `src/types/index.ts`) + `src/lib/data/banners.ts`
  (mock) — preparado para múltiplos banners e administração futura.
- `ProductQuery.badge` (`src/lib/repositories/product-query.ts`) —
  filtro por badge específico, conectado no `/api/products` e no
  `useProductQuery`. Mesma arquitetura de busca da Sprint 6 — sem
  acoplamento a mocks, compatível com Tiny.
- `src/lib/analytics.ts`: `trackEvent()` tipado
  (`banner_click`/`category_click`/`favorite_click`/`product_click`) —
  estrutura apenas, sem integração real. Conectado em `HomeHero`,
  `HomeCategories`, `FavoriteButton`, `ProductCard` (prop opcional
  `analyticsSource`).
- `src/services/recommendation-service.ts`: `RecommendationStrategy`
  (interface), `RecommendationContext` (tipo), `RecommendationProvider`
  (injeção de dependência, mesmo padrão do `CatalogService`),
  `FeaturedFallbackStrategy` (trivial, determinística, não-IA) — pronta
  para a Lumi implementar a mesma interface depois. Não conectada a
  nenhuma seção visível nesta sprint (deliberado).
- `docs/features/home.md` (novo).
- Testes: `HomeSection.test.tsx` (6), `HomeHero.test.tsx` (6),
  `recommendation-service.test.ts` (6), +1 teste de filtro por badge em
  `product-query.test.ts`.
- Dependências de teste: `jsdom`, `@testing-library/react` — primeira
  vez que o projeto testa renderização de componente de verdade, não só
  lógica pura.

### Alterado
- `src/app/page.tsx`: recomposta como Hero + seções (Continue Comprando,
  Favoritos, Categorias em Destaque, Mais Vendidos, Novidades) +
  filtro/grid de catálogo já existente (intocado). Seções secundárias
  carregadas via `next/dynamic` (code-split, lazy).
- `src/app/api/products/route.ts`, `src/hooks/useProducts.ts`: aceitam/
  repassam o novo parâmetro `badge`.
- `ProductCard.tsx`: prop opcional `analyticsSource` para tracking de
  `product_click` — omitir a prop mantém o comportamento anterior
  idêntico.
- `FavoriteButton.tsx`: dispara `favorite_click` ao alternar.
- `vitest.config.ts`: `include` passa a cobrir `*.test.tsx`; `esbuild.jsx: "automatic"` para suportar JSX nos testes de componente.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **150/150** (19 novos).
  `npm run build`: compila, 23 rotas.
- Confirmado manualmente: `HomeContinueShopping`/`HomeFavorites` não
  aparecem no HTML quando carrinho/favoritos estão vazios; `/api/products?badge=mais-vendido`
  e `?badge=novo` retornam os conjuntos corretos e distintos.

### Documentação
- `docs/features/home.md` (novo), `docs/ARCHITECTURE.md`,
  `docs/ROADMAP.md` (nova Fase 2D).

## [0.17.0] — 2026-07-26 — Sprint 8: Favoritos Inteligentes

> Escopo: infraestrutura de favoritos, replicando os princípios do
> carrinho persistente (Sprint 7). Sem login, sem IA, sem integração
> Tiny, sem compartilhamento WhatsApp — só a base.

### Adicionado
- `src/lib/persist/safe-local-storage.ts`: `createSafeLocalStorage<T>(label)`
  — fábrica genérica extraída de `cart-store.ts`, para que qualquer store
  persistido (carrinho, favoritos, e futuros) reutilize a mesma
  recuperação de dados corrompidos em vez de duplicá-la.
- `src/features/favorites/store/favorites-store.ts`: `useFavoritesStore`
  (add/remove/toggle/clear/isFavorite), `useFavoritesCount`,
  `useIsFavorite` — mesmo desenho do `useCartStore`.
- `src/services/favorites-service.ts`: `resolveFavoriteProducts` — lógica
  pura, mesmo papel que `cart-service.ts`.
- `src/features/favorites/hooks/useFavoriteProducts.ts`,
  `src/features/favorites/components/FavoriteButton.tsx`.
- `src/app/favoritos/page.tsx`: página "Meus Favoritos" (estado vazio,
  grid reaproveitando `ProductGrid`, "limpar favoritos").
- `FavoriteEntry` (tipo, `src/types/index.ts`) — deliberadamente sem
  `variantId` (favoritar é por produto, não por variação); `addedAt`
  preparado para recência/campanhas futuras, sem uso na UI ainda.
- Testes: `safe-local-storage.test.ts` (6), `favorites-store.test.ts`
  (10), `favorites-service.test.ts` (4).

### Alterado
- `src/features/cart/store/cart-store.ts`: usa `createSafeLocalStorage`
  compartilhado em vez da implementação inline da Sprint 7 (mesmo
  comportamento, sem duplicação).
- `Header.tsx`: ícone de favoritos com badge, ao lado do carrinho (mesmo
  padrão visual).
- `ProductCard.tsx`, `ProductDetail.tsx`: botão de favoritar.

### Verificado
- `npm run lint`: 0 erros. `npm run test`: **131/131** (20 novos).
  `npm run build`: compila, 23 rotas.

### Documentação
- `docs/features/favorites.md` (novo), `docs/ARCHITECTURE.md`,
  `docs/ROADMAP.md`, `docs/SPRINT_8_REPORT.md` (novo).

## [0.16.0] — 2026-07-26 — Sprint 7: Carrinho Persistente

> Escopo: reforçar a infraestrutura de carrinho já existente desde a
> Fase 0 (Zustand + localStorage + `cart-service.ts`) para suportar o
> crescimento da plataforma. **Não** era uma sprint de checkout — nenhum
> fluxo de compra, pagamento, login, favoritos ou WhatsApp foi criado ou
> alterado. Arquitetura de repositórios intocada; nenhuma dependência
> nova da Tiny.

### Adicionado
- `useCartStore.hasItem(productId, variantId?)` — consulta de existência
  de produto/variação no carrinho.
- `useIsInCart(productId, variantId?)` — hook seletor escopado (só
  re-renderiza quando a presença daquele produto específico muda).
- Botões "Continuar comprando" e "Limpar carrinho" na página do
  carrinho (estado não-vazio) — antes só existia "Ver produtos" no
  estado vazio.
- `src/features/cart/store/cart-store.test.ts` (13 testes): adição,
  produto repetido (incrementa, não duplica), variação diferente vira
  linha separada, remoção, alterar quantidade, quantidade zero/negativa
  remove automaticamente, existência (`hasItem`), limpeza, persistência
  (escrita real em localStorage), recuperação (nova instância do store
  lê o que foi salvo), e dois testes de recuperação de dados corrompidos.
- `src/services/cart-service.test.ts` (9 testes): resolução de linhas,
  produto removido do catálogo (descartado sem quebrar), priceModifier
  de variação, subtotal/quantidade total, carrinho vazio.

### Corrigido — bug real encontrado durante a revisão
- `createJSONStorage` (padrão do `persist` do Zustand) **não captura
  erros de `JSON.parse`** — se `localStorage["love-mimos-cart"]`
  contivesse JSON corrompido, a inicialização do store lançava uma
  exceção não tratada, capaz de derrubar a aplicação inteira. Corrigido
  com um `storage` customizado em `cart-store.ts` que faz o parse
  manualmente dentro de um `try/catch`: em falha, loga um aviso, limpa a
  chave corrompida, e devolve carrinho vazio — nunca propaga a exceção.
  Testado explicitamente (dois testes dedicados).

### Removido
- Estado morto do `cart-store.ts`: `isOpen`, `openCart`, `closeCart` —
  confirmado por busca no código que nunca foram consumidos por nenhum
  componente (resquício de um design de carrinho em drawer considerado
  e abandonado em sprints anteriores).

### Verificado
- `npm run lint`: 0 erros.
- `npm run test`: **112/112** (22 novos: 13 de `cart-store`, 9 de
  `cart-service`) — o carrinho não tinha nenhum teste antes desta
  sprint.
- `npm run build`: compila, 22 rotas.

### Documentação
- `docs/features/cart.md`: reescrito — nova seção de performance
  (§6), decisões do storage customizado e do `hasItem`, remoção do
  estado morto documentada.
- `docs/ARCHITECTURE.md`: seção de carrinho atualizada com o reforço da
  Sprint 7; referências a hooks já substituídos na Sprint 6
  (`useProducts`/`useProductSearch`) marcadas como históricas.
- `docs/ROADMAP.md`: nova Fase 2B documentando a sprint.
- `docs/SPRINT_7_REPORT.md`: novo.

## [0.15.0] — 2026-07-26 — Sprint 6: Busca e Descoberta de Produtos

> Escopo: transformar busca/navegação por categoria em experiência
> funcional, rápida e URL-driven, funcionando igualmente com
> `MockProductRepository` e `TinyProductRepository` (que segue
> aguardando confirmação do suporte da Olist/Tiny, sem nenhuma mudança
> na arquitetura preparada para ela). Identidade visual, Design System e
> fluxo de compra intocados; nenhuma funcionalidade fora de escopo
> (favoritos, login, Lumi, checkout novo, painel admin, escrita na Tiny)
> foi criada.

### Adicionado
- `src/lib/repositories/product-query.ts`: o motor de busca/ordenação/
  paginação — `ProductQuery`, `ProductQueryResult`, `applyProductQuery()`,
  `normalizeProductQuery()` (fallback seguro para parâmetros inválidos).
  Função pura, compartilhada por `MockProductRepository` e
  `TinyProductRepository` — nenhuma lógica de filtro duplicada.
- `src/utils/normalize-text.ts`: normalização de texto para busca
  (remove acento, ignora caixa, colapsa espaço) — `normalizeSearchText()`,
  `searchTerms()`.
- `ProductRepository.query()` (novo método no contrato,
  `src/lib/repositories/contracts.ts`) — busca, categoria, ordenação,
  paginação, disponibilidade, destaque. `findAll`/`findByCategory`/
  `search` continuam existindo, agora implementados como wrappers finos
  sobre `query()` em ambos os repositórios.
- `catalogService.queryProducts()` — novo método de serviço.
- `src/hooks/useProducts.ts`: `useProductQuery(params)` substitui
  `useProducts`/`useProductSearch` — um único hook, usado por Home e
  Busca.
- `src/features/product/components/SortSelect.tsx`: seletor de
  ordenação (relevância/menor preço/maior preço/nome A-Z) — `<select>`
  nativo estilizado, sem introduzir um novo padrão visual.
- `src/features/product/components/SearchPageContent.tsx`: conteúdo da
  Busca extraído para permitir o `<Suspense>` que `useSearchParams`
  exige (ver "Alterado" abaixo).
- Testes novos: `normalize-text.test.ts` (6), `product-query.test.ts`
  (23 — busca com/sem acento, parcial, múltiplas palavras, combinação
  busca+categoria, ordenação por preço/nome, paginação, filtros de
  disponibilidade/destaque, fallback de parâmetros inválidos),
  `product-repository-contract.test.ts` (8 — mesma suíte rodada contra
  Mock e Tiny, provando compatibilidade de contrato).

### Alterado
- `src/app/api/products/route.ts`: aceita o conjunto completo de
  parâmetros (`q`, `categoria`, `ordem`, `pagina`, `limite`,
  `disponivel`, `destaque`) e devolve `{ items, total, page, pageSize,
  hasMore }` em vez de um array simples.
- `src/app/page.tsx` (Home): migrada para `useProductQuery`, eliminando
  o filtro duplicado (buscava tudo e refiltrava em memória) — agora só
  filtra uma vez, no motor de busca.
- `src/app/busca/page.tsx`: virou um Server Component fino (`Header`
  imediato + `<Suspense>`) envolvendo `SearchPageContent.tsx` — exigência
  real do Next.js para qualquer componente que usa `useSearchParams`,
  descoberta durante o build desta sprint.
- `src/features/product/components/SearchBar.tsx`: agora é um
  `<form>` com `role="search"`, `aria-label`, submissão no Enter (com
  `preventDefault` e guarda contra termo vazio), e um `onSubmit` opcional
  para sincronizar a URL imediatamente sem esperar o debounce.
- `src/features/product/components/ProductGrid.tsx`: novos estados
  `isLoading` (skeleton), `isError` (com retry), e `emptyAction`
  (botão de ação no estado vazio) — antes só tinha a mensagem de vazio.
- `src/features/product/components/ProductCard.tsx`: exibe "Esgotado"
  quando `stock <= 0` (campo real do modelo, nada inventado).
- `src/lib/repositories/mock/mock-product-repository.ts` e
  `tiny/tiny-product-repository.ts`: `findAll`/`findByCategory`/`search`
  reimplementados como wrappers sobre `query()` — a implementação
  antiga do `search()` da Tiny não normalizava acento; agora usa o
  mesmo motor unificado.
- `src/features/cart/hooks/useCartLines.ts`: atualizado para
  `useProductQuery` (o hook anterior que usava foi removido).

### Verificado
- `npm run lint`: 0 erros.
- `npm run test`: **90/90** (39 novos).
- `npm run build`: compila, 22 rotas.
- URLs reais testadas manualmente: `/busca?q=cola`,
  `/busca?categoria=cilios`, `/busca?q=cola&categoria=colas&ordem=menor-preco`,
  paginação (`limite=3&pagina=1/2`, sem sobreposição), busca sem
  resultado, parâmetros inválidos (`ordem=xyz&pagina=-5&limite=99999`) —
  todos HTTP 200, comportamento correto.

### Itens propositalmente adiados (documentados, não esquecidos)
- Sugestões de busca/autocomplete, histórico de buscas recentes.
- Número da página de "carregar mais" não vai para a URL (decisão de
  escopo — ver [SPRINT_6_REPORT.md](./SPRINT_6_REPORT.md)).

## [0.14.0] — 2026-07-25 — Sprint 5A: preparação para homologação real (sem conectar ainda)

> Escopo: revisar e reforçar toda a integração Tiny (validação de
> ambiente, logs, retry, normalizador) para máxima segurança e
> observabilidade — **sem conectar a uma conta real, sem usar
> credenciais reais, sem criar dados, sem alterar regras de negócio**.
> `MockProductRepository` continua o padrão e não foi removido.

### Adicionado
- `src/lib/repositories/tiny/logger.ts`: logger estruturado e centralizado
  — início de conexão, autenticação (sucesso/falha com duração),
  requisição (path + status + duração), contagem de registros retornados,
  timeout, erro de rede, tentativas de retry, alerta de rate limit baixo,
  fallback. Todas as chamadas `console.*` espalhadas por
  `tiny-client.ts`/`tiny-product-repository.ts`/`tiny-category-repository.ts`
  passaram a usar este único módulo.
- `src/lib/repositories/tiny/retry.ts`: retry automático para falhas
  transitórias (`timeout`, `network`, HTTP 429/5xx) — até 2 tentativas
  extras com espera de 300ms/600ms. **Nunca** reexecuta erros de
  autenticação (401/403) ou 404, já que uma nova tentativa não mudaria o
  resultado.
- `src/lib/repositories/tiny/tiny-client-errors.ts`: `TinyApiError`
  extraído para módulo próprio (evita dependência circular entre
  `tiny-client.ts` e `retry.ts`); recomposto de volta em `tiny-client.ts`
  para compatibilidade com todo código existente.
- `src/app/dev/tiny-status/page.tsx`: página de diagnóstico interno
  (`/dev/tiny-status`) — mostra fonte de dados ativa, se cada credencial
  está configurada (só booleano, nunca o valor), e a saúde da integração
  (último sucesso, fallback ativo, motivo do último fallback). Retorna
  404 real em produção (`NODE_ENV=production`), testado explicitamente.
- `src/lib/env.test.ts`: testes da validação centralizada — variáveis
  ausentes, formato inválido (espaço em branco, curto demais,
  placeholder óbvio), resolução seletiva do timeout, resolução segura de
  `DATA_SOURCE`.
- 5 novos testes de retry em `tiny-client.test.ts`: sucesso após falha
  transitória, confirmação de que erro de autenticação nunca é
  retentado.
- 6 novos testes em `tiny-mapper.test.ts`: preço/estoque/id como string
  numérica, preço como string não-numérica (produto não mapeável),
  `situacao` com espaço/caixa diferente.

### Alterado
- `src/lib/env.ts`: `validateTinyEnv()` agora detecta credenciais
  **inválidas** (não só ausentes) — valor com espaço em branco, mais
  curto que 8 caracteres, ou igual a um placeholder óbvio (`changeme`,
  `xxx`, etc.). Nova função `resolveRequestTimeoutMs()` valida
  `TINY_REQUEST_TIMEOUT_MS` e cai para o padrão (8000ms) com aviso claro
  se o valor configurado não for um número positivo.
- `src/lib/repositories/tiny/tiny-mapper.ts`: campos numéricos
  (`precos.preco`, `precos.precoPromocional`, `estoque.quantidade`,
  `variacoes[].precos.preco`) agora toleram vir como string numérica
  (`"42.90"`), um padrão comum em integrações reais de ERP — nunca mais
  produzem `NaN`. `situacao` normalizado (trim + uppercase) antes de
  comparar com `"A"`/`"I"`/`"E"`.
- `.env.example`: adicionada `NEXT_PUBLIC_SITE_URL` (introduzida na
  Sprint de Branding mas nunca documentada aqui — lacuna encontrada e
  corrigida nesta revisão); nota sobre a nova validação de formato.
- `docs/API_TINY.md` §7: documentada a política de retry.

### Verificado
- `npm run lint`: sem erros.
- `npm run test`: **51/51** (23 da Sprint 4 + 8 da Sprint 5 + 20 novos
  desta sprint).
- `npm run build`: compila; `/dev/tiny-status` aparece como rota
  dinâmica.
- `/dev/tiny-status` retorna 404 em produção (`next build && next
  start`) e HTTP 200 com conteúdo correto em desenvolvimento (`next
  dev`) — testado explicitamente nos dois modos.
- Todas as rotas de página e API (`/`, `/busca`, `/carrinho`,
  `/produto/[slug]`, 404, `/api/products`, `/api/categories`)
  revalidadas sem regressão.

### Não feito nesta sprint (conforme escopo)
- Nenhuma conexão real com a Tiny.
- Nenhuma credencial real usada ou criada.
- Nenhuma regra de negócio alterada.
- `MockProductRepository` não foi removido — continua o padrão.

## [0.13.0] — 2026-07-25 — Sprint de Branding

> Nenhum arquivo de identidade visual foi anexado a esta sprint (pasta
> de uploads verificada, vazia). Toda a implementação usa a identidade
> Love Mimos já estabelecida desde a Sprint 1 (paleta plum/rose/gold,
> wordmark Fraunces, motivo da curva de cílio) — ver
> [BRAND_GUIDELINES.md §0](./BRAND_GUIDELINES.md#0-nota-de-proveniência).
> `DESIGN_SYSTEM.md`, arquitetura, layout, componentes e fluxo de compra
> permanecem intocados; nenhuma funcionalidade nova foi criada.

### Adicionado
- `src/components/brand/BrandLogo.tsx`: componente único e reutilizável
  da marca — variantes `full`/`compact`/`icon`, temas `dark`/`light`,
  tamanhos `sm`/`md`/`lg` (mapeados aos tokens H1/H2/H3 do Design
  System).
- `src/components/brand/BrandMark.tsx`: o traço da curva isolado, sem
  texto — usado pelo `variant="icon"` e como base do favicon/app icon.
- `src/components/brand/BrandSplash.tsx`: splash in-app (fundo `plum`,
  `BrandLogo` tema `light`, ~900ms, uma vez por sessão) — equivalente
  funcional a uma splash screen de PWA instalado, apropriado para um app
  aberto via link do WhatsApp (ver justificativa em
  [BRAND_GUIDELINES.md §7](./BRAND_GUIDELINES.md#7-splash-screen)).
- `src/app/icon.tsx`, `src/app/apple-icon.tsx`: favicon/app icon (64×64,
  180×180) gerados via `next/og` `ImageResponse` — sem depender de
  nenhuma ferramenta externa de rasterização.
- `src/app/opengraph-image.tsx`: imagem de compartilhamento (1200×630)
  para quando o link da loja é enviado no WhatsApp/redes sociais.
- `src/app/manifest.ts`: manifest PWA (nome, cores de tema, ícones) —
  habilita "adicionar à tela de início".
- `docs/BRAND_GUIDELINES.md`: cores oficiais (reaproveitadas do Design
  System, sem paleta divergente), uso do `BrandLogo`, área de proteção,
  tamanhos mínimos, fundos permitidos, usos proibidos.

### Alterado
- `src/components/layout/Header.tsx`: usa `BrandLogo` em vez do antigo
  `Logo`.
- `src/app/layout.tsx`: metadados expandidos (`openGraph`, `twitter`,
  `manifest`, `metadataBase` — com placeholder documentado para o
  domínio real, mesmo padrão do número de WhatsApp em
  `lib/config.ts`); `BrandSplash` montado no `<body>`.

### Removido
- `src/components/layout/Logo.tsx`: componente temporário, substituído
  integralmente por `BrandLogo`. Nenhuma referência restante (confirmado
  por busca no projeto).

### Verificado
- `npm run build`, `npm run lint`, `npm run test` (31/31) — sem erros.
- `/icon`, `/apple-icon`, `/opengraph-image` retornam PNG real (inspeção
  visual confirmada); `/manifest.webmanifest` retorna JSON válido;
  meta tags `og:*` confirmadas na Home.
- Todas as rotas de página (Home, Busca, Carrinho, Detalhe de Produto,
  404) revalidadas sem regressão.

## [0.12.0] — 2026-07-25 — Sprint 5: revisão de segurança + preparação para homologação (NO-GO)

> Escopo: homologar a integração Tiny contra uma conta real, com
> segurança, rastreabilidade e rollback imediato para mock. **Sem
> credenciais reais disponíveis neste ambiente**, a homologação real
> (Fases 3 e 6 do brief) não foi executada — decisão explícita de não
> fabricar resultados. Tudo que não depende de conta real foi executado.
> Layout, Design System, fluxo de compra e componentes visuais
> permanecem intocados.

### Adicionado
- `docs/ARCHITECTURE_REVIEW_SPRINT_5.md`: revisão de segurança/arquitetura
  com o comando exato de cada verificação e o resultado real —
  nenhuma violação encontrada (acesso direto à Tiny pelo frontend,
  imports diretos de mock em telas, credenciais hardcoded, variáveis
  públicas com segredo, logs com token).
- `docs/SPRINT_5_REPORT.md`: relatório de homologação — **NO-GO** para
  `DATA_SOURCE=tiny` em produção até uma homologação real acontecer;
  inclui o passo a passo de como configurar credenciais localmente sem
  versioná-las.
- `src/lib/repositories/tiny/status.ts`: rastreador interno (em memória,
  nunca exposto ao cliente) de fonte de dados ativa, horário da última
  leitura bem-sucedida da Tiny, e ocorrência de fallback — atende ao
  requisito de a origem dos dados ser identificável internamente.
- 8 novos testes em `tiny-client.test.ts`: 403, 404, 429, 500, JSON
  corrompido, falha de rede — cobrindo a matriz completa de códigos
  HTTP pedida na Fase 4 (testável via mocks, sem precisar de conta real).
- 1 novo teste em `tiny-product-repository.test.ts`: payload incompleto
  (produto com campos essenciais ausentes) não derruba o catálogo
  inteiro.
- 1 novo teste em `tiny-mapper.test.ts`: nome com acentuação e caracteres
  especiais gera slug ASCII limpo sem quebrar.

### Alterado
- `src/lib/env.ts`: nova função `validateTinyEnv()` — validação
  centralizada que retorna só nomes de variáveis ausentes (nunca
  valores), usada pelo composition root para a mensagem de erro segura
  exigida quando `DATA_SOURCE=tiny` está mal configurado.
- `src/lib/repositories/index.ts`: passa a usar `validateTinyEnv()` em
  vez do booleano simples anterior.
- `src/lib/repositories/tiny/tiny-product-repository.ts` e
  `tiny-category-repository.ts`: chamam `recordTinySuccess()`/
  `recordTinyFallback()` do novo rastreador de status.

### Verificado
- `npm run test`: **31/31** (23 da Sprint 4 + 8 novos).
- `npm run build`, `npm run lint`: sem erros.
- Buscas por credenciais hardcoded, imports diretos indevidos, variáveis
  públicas com segredo: todas vazias (ver
  [ARCHITECTURE_REVIEW_SPRINT_5.md](./ARCHITECTURE_REVIEW_SPRINT_5.md)).
- `DATA_SOURCE=tiny` sem credenciais: fallback de configuração
  confirmado novamente, nenhuma rota quebra.

### Documentação
- `docs/API_TINY.md`: §7 expandido com a matriz de códigos HTTP testados;
  §9 atualizado com o rastreador de status interno.
- `docs/ROADMAP.md`: novo item explícito sobre a homologação pendente e a
  recomendação NO-GO atual.

### Não executado nesta sprint (documentado, não é uma pendência oculta)
- Fase 3 (homologação read-only contra conta Tiny real).
- Fase 6 (validação de interface com dados reais da Tiny).
Ambas dependem de credenciais reais, que não estavam disponíveis neste
ambiente — ver [SPRINT_5_REPORT.md](./SPRINT_5_REPORT.md) para o passo a
passo de como configurá-las e retomar essas fases.

## [0.11.0] — 2026-07-25 — Sprint 4: integração real com a Tiny ERP

> Escopo: implementar a primeira integração real de catálogo com a Tiny,
> mantendo a arquitetura desacoplada da Sprint 3. Layout, Design System,
> fluxo de compra, textos e componentes visuais permanecem intocados.
> `DATA_SOURCE=mock` continua sendo o padrão — Tiny é opt-in.

### Pesquisa
- `docs/API_TINY.md` reescrito do zero a partir da documentação oficial
  real (`api-docs.erp.olist.com`) — auth OAuth2, endpoints, paginação,
  rate limit, mapeamento de campos, todos com fonte citada. Achado
  crítico: `GET /produtos` (listagem) não retorna categoria/imagens/
  variações — só `GET /produtos/{id}` (detalhe) traz esses campos,
  exigindo um padrão N+1 documentado como risco de escala em §11.

### Adicionado
- `src/lib/env.ts`: config server-only (`DATA_SOURCE`, credenciais Tiny).
- `src/lib/repositories/tiny/`: `tiny-client.ts` (OAuth2, timeout,
  rate-limit, logs sanitizados), `tiny-mapper.ts` (mapeamento puro),
  `tiny-product-repository.ts`/`tiny-category-repository.ts`
  (paginação, cache TTL em memória, fallback controlado para o mock),
  `cache.ts`.
- `src/app/api/products/route.ts`, `src/app/api/categories/route.ts`:
  Route Handlers — nova fronteira cliente/servidor (ver "Corrigido"
  abaixo).
- `.env.example`: `DATA_SOURCE`, `TINY_CLIENT_ID`, `TINY_CLIENT_SECRET`,
  `TINY_REFRESH_TOKEN`, `TINY_REDIRECT_URI`, `TINY_REQUEST_TIMEOUT_MS`,
  todas documentadas.
- Vitest configurado (`vitest.config.ts`, script `npm run test`) — o
  projeto não tinha nenhum test runner até esta sprint.
- 23 testes novos: `tiny-mapper.test.ts` (15 — mapeamento, produto sem
  imagem, sem estoque, inativo, excluído, sem preço/nome, badge
  automático, variações, categorias), `tiny-client.test.ts` (3 — falha
  de autenticação, timeout, 401 com token válido), `tiny-product-repository.test.ts`
  (5 — resposta vazia, paginação multi-página, fallback controlado em
  `findAll`/`findBySlug`, produto inativo filtrado).

### Corrigido — vazamento de arquitetura encontrado durante a implementação
- `src/hooks/useProducts.ts` (usado por Client Components) chamava
  `catalogService` diretamente — o que exporia código capaz de
  autenticar com a Tiny ao alcance do navegador assim que a Tiny virasse
  real. Corrigido: hooks agora fazem `fetch()` contra os novos Route
  Handlers; `catalog-service.ts`, `lib/repositories/index.ts` e tudo em
  `lib/repositories/tiny/` marcados com o pacote `server-only`, que faz
  o build falhar se esse código for importado por um Client Component,
  mesmo transitivamente.
- `src/lib/repositories/index.ts`: composition root agora lê
  `DATA_SOURCE` e escolhe Mock ou Tiny; se `DATA_SOURCE=tiny` mas
  faltar alguma credencial, cai para o mock já na inicialização (com
  aviso no log) em vez de instanciar um cliente que falharia em toda
  requisição.

### Verificado
- `npm run build`, `npm run lint`, `npm run test` (23/23) — todos
  passando.
- Rotas de página e as duas novas API routes testadas manualmente com
  `DATA_SOURCE=mock` (padrão).
- `DATA_SOURCE=tiny` sem credenciais testado explicitamente: cai para o
  mock com aviso no log, nenhuma rota quebra.

### Documentação
- `docs/API_TINY.md`: reescrito (ver "Pesquisa" acima).
- `docs/ARCHITECTURE.md`: novas seções sobre a fronteira cliente/servidor
  (Route Handlers) e a integração Tiny real; linguagem que tratava a
  Tiny como hipotética foi corrigida.
- `docs/ROADMAP.md`: itens da Fase 2 marcados como concluídos onde
  corresponde à realidade; novos itens abertos para riscos reais
  (sincronização N+1, cache multi-instância).
- `docs/NON_FUNCTIONAL_REQUIREMENTS.md`: âncoras corrigidas.
- `docs/SPRINT_4_REPORT.md`: novo — relatório de entrega da sprint.

## [0.10.0] — 2026-07-24 — Sprint 3: camada de dados desacoplada

> Escopo: nenhuma tela nova, nenhuma mudança de fluxo de compra, nenhuma
> mudança no Design System, **nenhuma integração real com a Tiny** —
> só a arquitetura por baixo da UI foi reestruturada. Comportamento e
> aparência permanecem idênticos à Sprint 2.

### Adicionado
- `src/lib/repositories/contracts.ts`: interfaces `ProductRepository` e
  `CategoryRepository` — o contrato que qualquer fonte de dados (mock
  hoje, Tiny na Sprint 4) precisa implementar.
- `src/lib/repositories/mock/`: `MockProductRepository` e
  `MockCategoryRepository`, implementando essas interfaces sobre o
  catálogo estático existente.
- `src/lib/repositories/index.ts`: composition root — o único arquivo que
  a Sprint 4 precisa editar para trocar mock por Tiny.
- `src/services/catalog-service.ts`: `CatalogService`, camada que hooks e
  Server Components consomem (nunca os repositórios diretamente).
- `src/services/cart-service.ts`: lógica de domínio do carrinho
  (`resolveCartLines`, `computeCartTotals`, `buildCart`), pura e
  desacoplada de Zustand/React — extraída de dentro de `useCartLines`.
- `src/hooks/useProducts.ts`: novo hook `useCategories()`.
- `Cart` (tipo agregado: linhas resolvidas + subtotal + contagem) em
  `src/types/index.ts` — antes existia só implicitamente como o retorno
  de `useCartLines`.
- `docs/ARCHITECTURE.md`: documentação completa das camadas acima.

### Alterado
- `src/hooks/useProducts.ts`: `queryFn` de todos os hooks agora chama
  `catalogService` em vez de importar `lib/data/products`/`categories`
  diretamente. Mantido um `initialData` que ainda importa o mock
  diretamente, como exceção documentada (ver
  [ARCHITECTURE.md §5](./ARCHITECTURE.md#5-exceção-documentada-initialdata-em-srchooksuseproductsts))
  — preserva o carregamento instantâneo sem flash que a Sprint 2 já tinha.
- `src/features/cart/hooks/useCartLines.ts`: reescrito como composição
  fina — lê linhas do store, lê produtos via `useProducts()`, delega o
  cálculo para `buildCart`. Nenhuma lógica de negócio própria restante.
- `src/app/produto/[slug]/page.tsx` (Server Component): `generateStaticParams`
  e a busca do produto agora passam por `catalogService` em vez de
  importar `lib/data/products` diretamente — o padrão de repositório
  também se aplica no lado do servidor, não só em Client Components.
- `src/app/page.tsx` e `src/app/busca/page.tsx`: categorias agora vêm de
  `useCategories()` em vez de um import estático do array mock.

### Documentação
- `docs/API_TINY.md`: passo a passo de implementação reescrito para
  refletir a arquitetura real — a integração passa a ser "implementar
  `TinyProductRepository`/`TinyCategoryRepository` e trocar uma linha em
  `src/lib/repositories/index.ts`", não mais "editar o corpo dos hooks".
- `docs/ROADMAP.md`: Fase 2 marcada com o item de arquitetura já
  concluído; adicionado item sobre substituir o atalho de `initialData`
  por estados de carregamento reais.

### Verificado
- `npm run build`, `npm run lint` e smoke test de todas as rotas
  (incluindo os 12 slugs de produto via `generateStaticParams` e o caso
  de 404) rodados com sucesso após a refatoração — nenhuma regressão
  visual ou de conteúdo.
- Confirmado por grep que só 3 arquivos no projeto importam
  `lib/data/products.ts`/`categories.ts` diretamente: os dois
  repositórios mock e a exceção documentada de `initialData`.

## [0.9.0] — 2026-07-24 — Sprint 2: Padronização visual completa

> Escopo: nenhuma funcionalidade nova, nenhum fluxo de compra alterado,
> nenhuma tela nova, nenhuma integração alterada — só aplicação integral
> do [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) à interface já existente.
> `CLAUDE.md` e `PROJECT_AUDIT.md` foram procurados no início da sprint e
> não existem no projeto — seguimos sem eles.

### Adicionado (tokens novos, para fechar lacunas reais entre doc e código)
- `tailwind.config.js`: `fontSize.h1` (28px), `fontSize.h2` (22px),
  `fontSize.title` (15px) e `fontSize.micro` (11px) — os únicos 4
  tamanhos da tipografia oficial que não existiam nativamente no
  Tailwind (H3/Texto/Legendas/Botões já eram exatos via `text-lg`/
  `text-sm`/`text-xs`).

### Corrigido — bugs reais encontrados na auditoria
- `FreeShippingBar`: animação da barra de progresso usava `duration-500`
  (500ms) — **violava o próprio teto de 250ms** do Design System.
  Reescrita com Framer Motion, 250ms.
- `ProductImagePlaceholder`: a categoria "colas" usava um hex órfão
  (`#EAD9E8`) que não correspondia a nenhum token de marca — corrigido
  para `rose-100` (`#F7E4E4`), o mesmo tom usado por "cílios" e
  "acessórios".
- `Button`: os tamanhos `sm` e `lg` sobrescreviam o texto do label para
  12px e 16px respectivamente — o token Botões é sempre 14px,
  independente do tamanho; só altura/padding deveriam variar. Corrigido.

### Alterado — consistência de cor
- **12 arquivos** migrados de `bg-white` (utilitário nativo do Tailwind)
  para `bg-neutral-0` (token oficial, mesmo hex `#FFFFFF`, agora
  rastreável ao sistema).
- **Opacidade de texto**: consolidados **8 valores diferentes**
  (`ink/30,35,40,45,50,55,60,70`, usados sem critério) em **3 tiers
  oficiais** — `ink/70` (secundário), `ink/50` (terciário/meta), `ink/35`
  (mudo/riscado). Documentado em
  [DESIGN_SYSTEM.md §3](./DESIGN_SYSTEM.md#hierarquia-de-opacidade-de-texto).
- **Opacidade de ícone** no `SearchBar` (lupa e botão de limpar) unificada
  de dois valores (`plum/40`, `plum/60`) para um (`plum/50`).
- Estado "Adicionado" do botão de carrinho (`ProductDetail`) trocado de
  `bg-plum` (reuso arbitrário da cor de marca para um estado de sucesso)
  para `bg-success-500` — uso correto do token semântico.
- `SVG` do logo e do `ProductImagePlaceholder`: `stroke="white"`/
  `stroke="#D4AF7A"` (hex/palavra-chave literal) migrados para
  `stroke-neutral-0`/`stroke-gold` (classes Tailwind via token).

### Alterado — consistência de tipografia
- Nome do produto na página de detalhe: `text-xl` (20px, fora de
  qualquer tier) → `text-lg` (18px, H3 exato).
- Preço na página de detalhe: `text-2xl` (24px) → `text-h1` (28px) — a
  tela de maior intenção de compra passa a ter o preço mais proeminente
  de toda a interface.
- Título do hero da Home: `text-2xl` (24px) → `text-h1` (28px, exato).
- Títulos de seção ("Todos os produtos", carrinho): `text-lg` (18px,
  errado — era H3 sendo usado como H2) → `text-h2` (22px, correto).
- Nome do produto no card do grid e no item do carrinho: `text-sm
  font-medium` (14px) → `text-title` (15px) — token Títulos correto,
  igual nos dois lugares (antes cada um tinha seu próprio valor "quase
  certo").
- "Total" no resumo do carrinho: `text-base` (16px, fora de qualquer
  tier) → `text-lg` (H3) — o número mais importante do resumo ganha
  hierarquia visual sobre o "Subtotal".
- Badges de contagem (carrinho, bottom nav) e texto "eyebrow" do hero:
  3 valores arbitrários (`text-[9px]`, `text-[10px]`, `text-[11px]`)
  consolidados no token `text-micro` (11px).

### Alterado — consistência de espaçamento (~20 correções para a escala de 8px)
- `gap-1.5` (6px) → `gap-2` (8px) em `TogglePill`, `ProductCard` (×2).
- `gap-3`/`p-3`/`pt-3`/`py-3`/`mt-3`/`mb-3` (12px) → `gap-4`/`p-4`/`pt-4`/
  `py-4`/`mt-4`/`mb-4` (16px) em `BackHeader`, `Header`, `QuantityStepper`,
  `CartLineItem`, `FreeShippingBar`, `ProductGallery`, carrinho e
  detalhe do produto.
- `px-5` (20px) → `px-6` (24px) em `Button` (tamanho `default`) e no
  hero da Home.
- `mt-5`/`pt-5` (20px) → `mt-6`/`pt-6` (24px) em duas seções do detalhe
  do produto.
- `mt-1.5` (6px) → `mt-2` (8px) no texto de estoque do detalhe do
  produto.
- `pr-9` (36px) → `pr-10` (40px) no `SearchBar`, dando mais respiro ao
  botão de limpar.
- Badge/desconto do `ProductCard`: posição absoluta `top-3`/`left-3`/
  `bottom-3`/`right-3` (12px) → `top-4`/`left-4`/`bottom-4`/`right-4`
  (16px), consistente com o padding interno do card.
- Documentada a exceção sancionada: alturas de `Button` (36-48px) seguem
  mínimos de toque de iOS/Android (HIG), não a escala de 8px — ver
  [DESIGN_SYSTEM.md §5](./DESIGN_SYSTEM.md#5-espaçamento).

### Alterado — eliminação de duplicação/inconsistência de estilo
- Botão "Ver produtos" no carrinho vazio: removida uma sobrescrita
  manual de cor (`variant="secondary"` com `className` forçando
  `bg-plum text-white`, reimplementando visualmente a variante
  `primary`) — trocado por `variant="primary"` puro.
- Pills de variação de produto (`ProductDetail`) tinham uma sobrescrita
  de peso de fonte (`text-xs font-medium`) que as deixava visualmente
  diferentes das pills de categoria, mesmo usando o mesmo componente
  `TogglePill` — removida, as duas agora são idênticas.

### Melhorado — microinterações (Framer Motion / tap feedback)
- `BottomNav`: cor do ícone/label ativo↔inativo agora anima
  (`transition-colors duration-200`) — antes trocava instantaneamente.
- `QuantityStepper`, `SearchBar` (botão de limpar), `BackHeader` (botão
  voltar), `TogglePill`: adicionado `active:scale-90`/`active:scale-95`
  — antes só o `Button` genérico e o card de produto tinham feedback de
  toque.
- `FreeShippingBar`: barra de progresso migrada de CSS transition para
  Framer Motion (`animate`), com easing explícito.
- `ProductGrid`: stagger de entrada agora com `transition: { duration:
  0.2 }` explícito no item (antes dependia do padrão implícito do
  Framer Motion, que pode exceder 250ms para animações de posição).

### Documentação atualizada
- `DESIGN_SYSTEM.md`: tabela de tipografia atualizada com a classe
  Tailwind exata de cada tier; nova seção "Hierarquia de opacidade de
  texto" (3 tiers); documentada a exceção sancionada de hex no
  `ProductImagePlaceholder`; documentada a exceção sancionada de altura
  de `Button` (HIG); adicionada regra `bg-neutral-0` vs. `bg-white`.

## [0.8.0] — 2026-07-24

### Alterado
- `docs/DESIGN_SYSTEM.md` reescrito como referência oficial de 14 seções:
  conceito de marca, princípios de UX, paleta completa (primária,
  secundária, neutra, sucesso, alerta, erro), tipografia com tamanhos por
  nível, espaçamento em múltiplos de 8, escala de border radius, escala
  de sombras, catálogo de componentes (implementados vs. especificados),
  biblioteca de ícones oficial, regras de animação (Framer Motion, teto
  de 250ms), responsividade, acessibilidade, exemplos de uso e regras
  obrigatórias.
- `tailwind.config.js`: adicionados tokens que o novo documento passa a
  exigir — escala `neutral-*` (grafite/bege neutro, sem matiz de marca),
  cores semânticas `success-*`, `alert-*`, `error-*`, e `shadow-modal`
  (para Bottom Sheet/Modal, ainda não implementados como componentes).
- Âncoras de `#7-mobile-first-sempre` atualizadas para
  `#mobile-first-sempre` em `DELIVERY.md`, `ENGINEERING_GUIDELINES.md` e
  `NON_FUNCTIONAL_REQUIREMENTS.md`, já que a renumeração de seções mudou
  o índice.

## [0.7.0] — 2026-07-24

### Adicionado
- `docs/NON_FUNCTIONAL_REQUIREMENTS.md`: performance, acessibilidade,
  escalabilidade, confiabilidade/disponibilidade, segurança,
  compatibilidade, observabilidade, internacionalização e conformidade
  (LGPD) — cada requisito com sua forma de verificação, e lacunas reais
  marcadas explicitamente (ex.: sem monitoramento de erro em produção,
  sem Core Web Vitals medidos em dispositivo físico ainda).

## [0.6.0] — 2026-07-24

### Adicionado
- `VISION.md` na raiz do projeto: manifesto de uma página (missão, para
  quem, princípios não-negociáveis, o que o produto conscientemente não
  é) — distinto do `docs/PROJECT_VISION.md`, que continua sendo o
  documento técnico completo com os "porquês" de arquitetura.

## [0.5.0] — 2026-07-24

### Adicionado
- `docs/features/`: um documento por feature, espelhando `src/features/`
  — `product.md`, `cart.md`, `checkout-whatsapp.md` (fluxo cruzado entre
  as duas), `home-and-search.md` (telas que compõem a feature de produto
  sem ter pasta própria), e `README.md` explicando a convenção (toda
  pasta em `src/features/` precisa de um documento correspondente).

## [0.4.1] — 2026-07-24

### Corrigido
- Referências residuais a caminhos antigos (`lib/config.ts`) em
  `DELIVERY.md` e `ROADMAP.md`, atualizadas para `src/lib/config.ts`.
- Duplicação de código eliminada: extraído `src/components/ui/toggle-pill.tsx`
  (`TogglePill`), que substitui a mesma lógica de pill ativa/inativa
  copiada em `CategoryPills` e no seletor de variação de `ProductDetail`.

## [0.4.0] — 2026-07-24

### Adicionado
- Adotado o charter de engenharia "Love Mimos Platform": documentado em
  `docs/ENGINEERING_GUIDELINES.md` (stack, arquitetura, regras não
  negociáveis).
- Stack expandida: `@tanstack/react-query`, `framer-motion`,
  `class-variance-authority` + `@radix-ui/react-slot` (padrão shadcn/ui).
- `src/components/ui/button.tsx`: componente `Button` com variantes
  (`primary`, `secondary`, `ghost`, `whatsapp`, `link`) mapeadas para os
  tokens de marca — substitui botões ad-hoc em `WhatsAppCheckoutButton`,
  `ProductDetail` e no estado vazio do carrinho.
- `src/hooks/useProducts.ts`: catálogo agora servido via React Query
  (`useProducts`, `useProduct`, `useProductSearch`), preparado para a
  troca por chamadas reais à Tiny sem mudar componentes.
- `src/app/providers.tsx`: `QueryClientProvider` isolado em provider
  próprio.
- Animações com Framer Motion: stagger de entrada no grid de produtos,
  troca de estado "Adicionar ao carrinho" → "Adicionado", feedback de
  toque no botão de checkout.

### Alterado
- **Migração de estrutura**: projeto todo movido de `app/`/`components/`/
  `lib/` (raiz) para arquitetura Feature-First em `src/`:
  `src/app`, `src/features/{product,cart}`, `src/components`,
  `src/services`, `src/hooks`, `src/lib`, `src/types`, `src/utils`.
  Alias `@/*` em `tsconfig.json` atualizado para apontar para `./src/*`.
- `components/ui/Badge.tsx` renomeado e movido para
  `src/features/product/components/ProductBadge.tsx` (componente
  específico do domínio de produto, não genérico o suficiente para
  `components/ui/`).

### Verificado
- `npm run build`, `npm run lint` e smoke test de todas as rotas
  reexecutados com sucesso após a migração — nenhuma regressão de
  conteúdo renderizado.

## [0.3.0] — 2026-07-24

### Adicionado
- Suíte de documentação em `docs/`: `DESIGN_SYSTEM.md`, `ROADMAP.md`,
  `API_TINY.md`, `AI_ASSISTANT.md` (proposta), `ADMIN_PANEL.md` (proposta),
  `DELIVERY.md`, `CHANGELOG.md` — `PROJECT_VISION.md` reorganizado como
  ponto de entrada, com o conteúdo específico movido para os documentos
  dedicados.

## [0.2.0] — 2026-07-24

### Corrigido
- Erro de tipo em `lib/hooks/useCartLines.ts` que quebrava `npm run build`
  (`Type 'null' is not assignable to type 'CartLineWithProduct'`) —
  lógica de resolução do carrinho reescrita com `reduce` em vez de
  `map` + `filter` com type predicate.
- `next` atualizado de `14.2.5` para `14.2.35` (correção de vulnerabilidade
  de segurança conhecida na versão anterior).
- Warning de lint `@next/next/no-page-custom-font` suprimido com
  justificativa explícita (falso positivo da regra no App Router, que não
  usa `pages/_document.js`).

### Adicionado
- `eslint` e `eslint-config-next` como dependências de desenvolvimento —
  o projeto tinha o script `npm run lint` mas nenhuma configuração de
  lint instalada.

### Verificado
- `npm run build`, `npm run lint`, `npm start` + smoke test de todas as
  rotas (`/`, `/busca`, `/carrinho`, múltiplos `/produto/[slug]`, e o
  caso de 404) rodados localmente com sucesso. Detalhes em
  [DELIVERY.md §2](./DELIVERY.md#2-o-que-foi-verificado-antes-da-entrega).

## [0.1.0] — 2026-07-23

### Adicionado
- Estrutura inicial do projeto: Next.js 14 (App Router) + TypeScript +
  Tailwind CSS.
- Design system aplicado: paleta plum/rose/gold, tipografia Fraunces +
  Plus Jakarta Sans, motivo visual de curva de cílio no logo e nos
  placeholders de produto.
- Catálogo mock: 12 produtos, 6 categorias (`lib/data/`).
- Carrinho com Zustand + persistência em localStorage
  (`lib/store/cart-store.ts`).
- Fluxo completo Home → Produto → Carrinho → checkout via link do
  WhatsApp (`lib/whatsapp.ts`).
- Telas: `/`, `/busca`, `/produto/[slug]`, `/carrinho`.
- `README.md` inicial e primeira versão de `docs/PROJECT_VISION.md`.
