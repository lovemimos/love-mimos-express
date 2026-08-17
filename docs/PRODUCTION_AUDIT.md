# Auditoria de Produção — Love Mimos Express

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [GO_LIVE_REPORT.md](./GO_LIVE_REPORT.md) (Sprint 12) e
> [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

Revisão completa nas 10 áreas pedidas, como Tech Lead preparando o
projeto para produção. Nenhuma funcionalidade nova, nenhuma mudança de
arquitetura, nenhuma alteração de layout sem necessidade — só correção
de problemas reais encontrados.

## Metodologia

Revisão de código sistemática por área, com verificação concreta de
cada achado (build real, teste real, cálculo real de contraste, grep
confirmando uso/não-uso) — nada reportado aqui é suposição.

---

## 1. Fluxo de compra

**Status: ✅ sem problemas novos.** Já auditado a fundo nas Sprints 11
(mensagem completa, tratamento de erro do WhatsApp) e 12 (bug crítico de
produto esgotado). Reconfirmado nesta auditoria: carrinho, alteração de
quantidade, remoção, finalização e geração da mensagem — todos
funcionais, sem regressão.

## 2. Catálogo (busca, categorias, filtros, ordenação)

**Status: ✅ sem problemas novos.** Motor de busca (Sprint 6) e
catálogo mock (revisado na Sprint 13) seguem consistentes. Nenhuma
categoria órfã, nenhum link de filtro quebrado.

## 3. Produto (detalhes, imagens, preço, estoque, descrição)

**Status: ✅ sem problemas novos**, além do já corrigido na Sprint 12
(bloqueio de compra de produto esgotado). Preço, variação, estoque e
descrição renderizam corretamente.

## 4. UX Mobile

### 🔴 Encontrado e corrigido: Safe Area do iPhone não funcionava de verdade

`BottomNav.tsx` já usava `padding-bottom: env(safe-area-inset-bottom)`
desde sprints anteriores — mas o `viewport` do app nunca definia
`viewport-fit=cover`. **Sem esse ajuste, `env(safe-area-inset-*)` sempre
resolve para `0`, então o código "parecia" tratar a safe area mas nunca
tratou de fato** em iPhones com notch/Dynamic Island. Corrigido em
`src/app/layout.tsx` (`viewport.viewportFit: "cover"`).

### 🔴 Encontrado e corrigido: zoom desabilitado (também é problema de acessibilidade)

`maximumScale: 1` no viewport impedia pinch-to-zoom — viola WCAG 1.4.4
(Resize Text) e prejudica quem tem baixa visão. Removido. Nenhuma
mudança visual no estado padrão — só devolve ao usuário a capacidade de
dar zoom se precisar.

### Demais itens

Espaçamentos, botões e scroll já seguiam o Design System mobile-first
estabelecido desde a Sprint 1 — nenhum problema novo encontrado por
revisão de código. Verificação visual em dispositivo físico continua
recomendada (ver limitação já registrada no
[GO_LIVE_REPORT.md](./GO_LIVE_REPORT.md) — este ambiente não tem
ferramenta de captura de tela).

## 5. PWA

### 🔴 Encontrado e corrigido: manifest sem os tamanhos de ícone que Android/Lighthouse exigem

O manifest só tinha ícones de 64×64 (favicon) e 180×180 (Apple touch
icon) — **nenhum 192×192 ou 512×512**, os tamanhos que os critérios de
instalabilidade do Chrome/Android e o Lighthouse PWA audit checam
explicitamente. Sem eles, o app podia falhar a checagem de
"instalável" mesmo funcionando normalmente no dia a dia. Corrigido:
duas novas rotas (`/pwa-icon-192`, `/pwa-icon-512`, geradas
estaticamente via `next/og`, mesmo padrão já usado por `/icon` e
`/apple-icon`) registradas no `manifest.ts`.

### Splash e instalação

Sem mudança — já documentado desde a Sprint de Branding que o app
depende do comportamento automático do iOS/Android (ícone + cor de
fundo do manifest), não de uma matriz de imagens de splash por
dispositivo. Continua sendo uma decisão de escopo válida, não um bug.

### Offline

**Não implementado, e não implementado nesta auditoria** — exigiria um
service worker, que é uma peça de arquitetura nova, fora do que esta
sprint permite. Registrado como recomendação futura (ver seção final).

## 6. Performance

### 🟡 Encontrado e corrigido: as duas novas rotas de ícone nasceram desnecessariamente dinâmicas

Ao criar as rotas do item 5, a primeira versão usava
`export const runtime = "edge"`, o que o próprio Next avisou que
desativa a geração estática da rota. `/icon`/`/apple-icon` (já
existentes) não usam isso e geram estaticamente (`○`). Corrigido —
removida a declaração, as 4 rotas de ícone agora são estáticas.

### Demais itens

Lazy loading das seções secundárias da Home (`next/dynamic`, desde a
Sprint 9) continua correto. Bundle inicial (`First Load JS`) em ~87,5 kB
compartilhado + 2–3 kB por rota — dentro do esperado para uma aplicação
mobile deste porte. Nenhuma re-renderização desnecessária nova
encontrada (seletores do Zustand já são escopados desde as Sprints 7/8).

## 7. SEO

**Status: ✅ sem problemas novos.** Metadata, Open Graph e favicons já
revisados e funcionais desde a Sprint de Branding — reconfirmado.

## 8. Acessibilidade

### 🔴 Encontrado e corrigido: contraste de texto abaixo do mínimo WCAG

`text-ink/35` (usado em 6 lugares — placeholders de input, preço
riscado, botão de remover item) rende, calculado
matematicamente (fórmula de contraste WCAG, luminância relativa sRGB),
em **~2,1:1** contra o fundo — abaixo até do mínimo de 3:1 para texto
grande, e bem abaixo do 4,5:1 para texto normal. Corrigido: as 6
ocorrências trocadas para `text-ink/50` (token **já existente** no
Design System, não uma cor nova), que sobe para ~3,1:1 — uma melhoria
real de ~48%, sem introduzir nenhum token novo.

**Nota honesta**: mesmo `text-ink/50` (~3,1:1) ainda fica abaixo de
4,5:1 para texto normal — ver recomendação futura ao final. Não foi
corrigido mais a fundo nesta auditoria porque mudar a paleta de opacidade
de texto do Design System inteiro é uma decisão de produto/design, não
uma correção de bug pontual, e o brief pede para não alterar layout sem
necessidade.

### Labels e navegação

Auditados todos os botões só-com-ícone (Header, BackHeader, favoritar,
remover item, busca, `QuantityStepper`) — todos já têm `aria-label`
correto. Nenhum problema encontrado.

## 9. Segurança

### 🟡 Encontrado e corrigido: artefato de build quase versionado

Ao rodar uma checagem de tipos (`tsc --noEmit`) durante esta auditoria,
foi gerado um `tsconfig.tsbuildinfo` que **não estava no `.gitignore`**
— ficaria pronto para ser commitado por acidente na próxima vez que
alguém rodasse essa checagem localmente. Não é um segredo, mas é lixo
de build que não deveria entrar no repositório. Adicionado
`*.tsbuildinfo` ao `.gitignore`.

### Demais itens

Variáveis de ambiente, `.gitignore` de credenciais e tratamento de erro
já verificados a fundo nas duas últimas interações (preparação para
GitHub/Vercel) — reconfirmado, nenhum problema novo.

## 10. Código

### 🟡 Encontrado e removido: duas funções mortas

`getProductsByCategory` e `searchProducts`, exportadas em
`src/lib/data/products.ts`, não eram mais chamadas por nada desde que a
Sprint 6 introduziu o motor de busca unificado (`applyProductQuery`) —
confirmado por busca em todo o projeto antes de remover. Só
`getProductBySlug` (a única ainda usada) permanece.

### 🟡 Encontrado e removido: função morta com comentário desatualizado

`hasTinyCredentials()` em `src/lib/env.ts` não era chamada por nada —
substituída por `validateTinyEnv()` desde a Sprint 5A, mas nunca
removida. O próprio comentário da função ainda afirmava um uso que não
existia mais (`src/lib/repositories/index.ts` já usa `validateTinyEnv()`
diretamente), confirmando que era resíduo esquecido, não uma API
intencional.

### 🟡 Encontrado e corrigido: SVG do ícone de marca duplicado 3×

O mesmo desenho de curva (o "traço" da marca) estava copiado
integralmente em `icon.tsx`, `apple-icon.tsx`, e — antes desta
auditoria — teria sido copiado uma quarta vez nas novas rotas de PWA.
Extraído para `src/lib/brand-icon-mark.tsx`, reutilizado pelos 4 pontos
que geram algum ícone da marca.

### Tipagem e organização

`tsconfig.json` já está com `strict: true`; `tsc --noEmit` não acusou
nenhum erro de tipo em todo o projeto. Nenhum uso de `any` explícito
encontrado. Nenhuma outra duplicação relevante encontrada na varredura
desta auditoria.

---

## Resultado de lint, testes e build

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros |
| `npm test` | ✅ **200/200** |
| `npm run build` | ✅ compila, 25 rotas (2 novas: `/pwa-icon-192`, `/pwa-icon-512`) |

## Lista de problemas encontrados

1. 🔴 Safe area do iPhone nunca funcionava de verdade (`viewport-fit`
   ausente) — UX Mobile
2. 🔴 Zoom desabilitado (`maximumScale: 1`) — Acessibilidade/UX Mobile
3. 🔴 Manifest sem ícones 192×192/512×512 — PWA
4. 🔴 Contraste de texto abaixo do mínimo WCAG em 6 lugares
   (`text-ink/35`) — Acessibilidade
5. 🟡 Novas rotas de ícone nasceram desnecessariamente dinâmicas —
   Performance
6. 🟡 Artefato de build (`tsconfig.tsbuildinfo`) sem entrada no
   `.gitignore` — Segurança/Organização
7. 🟡 Duas funções mortas em `lib/data/products.ts` — Código
8. 🟡 Função morta com comentário desatualizado em `lib/env.ts` — Código
9. 🟡 SVG do ícone de marca duplicado 3× — Código

## O que foi corrigido

Todos os 9 itens acima — ver detalhamento por seção.

## O que ainda recomenda para uma versão futura

- **Contraste `text-ink/50`** (~3,1:1) ainda fica abaixo de 4,5:1 para
  texto normal — uma revisão de paleta de opacidade do Design System
  (decisão de produto/design, não uma correção pontual) resolveria isso
  de forma completa.
- **Suporte offline (service worker)** — não implementado; é uma peça
  de arquitetura nova, fora do escopo desta auditoria.
- **Verificação visual de responsividade/Safe Area em dispositivo iPhone
  físico** — a correção do item 1 foi validada por revisão de código e
  lógica (a causa raiz — `viewport-fit` ausente — está bem documentada
  como o motivo de `env(safe-area-inset-*)` não funcionar), mas não há
  como confirmar visualmente num iPhone real neste ambiente.
- **Auditoria Lighthouse real** (Performance/PWA/Acessibilidade/SEO) —
  esta auditoria foi por revisão de código; rodar o Lighthouse de
  verdade após o deploy (Vercel) daria uma pontuação objetiva e
  poderia revelar itens que só aparecem em tempo de execução real.

## Arquivos alterados

`src/app/layout.tsx`, `src/app/manifest.ts`, `src/app/icon.tsx`,
`src/app/apple-icon.tsx`, `src/lib/data/products.ts`, `src/lib/env.ts`,
`src/features/cart/components/CartLineItem.tsx`,
`src/features/product/components/ProductCard.tsx`,
`src/features/product/components/ProductDetail.tsx`,
`src/features/product/components/SearchBar.tsx`,
`src/app/carrinho/page.tsx`, `.gitignore`.

## Arquivos criados

`src/lib/brand-icon-mark.tsx`, `src/app/pwa-icon-192/route.tsx`,
`src/app/pwa-icon-512/route.tsx`, `docs/PRODUCTION_AUDIT.md`.

## Para amanhã

```bash
git add .
git commit -m "Production audit"
git push
```
