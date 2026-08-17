# Relatório da Sprint 13 — Implantação do MVP

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md) · Ver também
> [PRODUCT_CATALOG_GUIDE.md](./PRODUCT_CATALOG_GUIDE.md) e
> [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

## Contexto

A partir desta sprint, o foco deixou de ser desenvolvimento — o
objetivo era preparar a aplicação para operar com produtos reais.
Nenhuma funcionalidade, arquitetura, IA, integração Tiny, componente ou
painel administrativo foi criado. O trabalho foi quase inteiramente
revisão, documentação e conteúdo, com uma única alteração de código (um
comentário reforçado no placeholder mais crítico).

**Leitura prévia**: `GO_LIVE_REPORT.md`, `MVP_CHECKLIST.md`,
`ROADMAP.md`, `CHANGELOG.md` — todos lidos antes de qualquer alteração.
`CLAUDE.md` não existe no projeto.

## O que foi ajustado

1. **Catálogo mock revisado** (task 1): os 12 produtos foram conferidos
   quanto a nomes, preços, categorias, descrições e SKUs. Resultado:
   **nenhuma inconsistência encontrada** — todas as 6 categorias em uso
   têm produtos e vice-versa, nenhum SKU duplicado, nenhum texto de
   preenchimento. Documentado em
   [PRODUCT_CATALOG_GUIDE.md §6](./PRODUCT_CATALOG_GUIDE.md#6-revisão-do-catálogo-mock-atual-sprint-13).
2. **`docs/PRODUCT_CATALOG_GUIDE.md` criado**: campos obrigatórios (nome,
   preço, situação ativa, categoria) e opcionais (SKU, promoção,
   imagens, estoque, variações, avaliação, badges), com o mapeamento
   exato para o cadastro na Tiny — o mesmo contrato dos dois lados, sem
   retrabalho quando a integração real for ativada.
3. **`docs/PRODUCTION_CHECKLIST.md` criado**: checklist operacional
   priorizado (🔴 bloqueia / 🟡 recomendado / 🔵 fora de escopo) cobrindo
   WhatsApp, domínio, variáveis de ambiente, Tiny, imagens, banners,
   favicon/manifest, SEO e testes finais.
4. **Mensagens ao usuário revisadas** (task 3): busca por texto
   técnico/temporário no conteúdo voltado à cliente — nenhum encontrado.
5. **Estados vazios revisados** (task 4): já usam o componente
   `EmptyState` compartilhado (extraído na Sprint 11), com mensagens
   amigáveis — confirmado, sem necessidade de alteração.
6. **Placeholders revisados** (task 5): o placeholder mais crítico
   (`whatsappNumber` em `src/lib/config.ts`) ganhou um comentário muito
   mais explícito, com exemplo concreto de formato — é o único item que
   de fato impede o lançamento real. Os demais placeholders (domínio,
   banner) já eram realistas o suficiente para o propósito.
7. **Imagens padrão revisadas** (task 6): confirmado que o placeholder
   de produto (`ProductImagePlaceholder`, SVG inline) e os ícones de
   categoria (`CategoryIcon`, com fallback para `Sparkles`) nunca
   podem gerar uma imagem quebrada — não há `<img>` apontando para um
   arquivo que pode não existir.
8. **`docs/DELIVERY.md` atualizado**: números desatualizados (4 telas,
   18 páginas — datavam de antes da Sprint 6) corrigidos; a seção de
   checklist de pré-lançamento agora aponta para
   `PRODUCTION_CHECKLIST.md` em vez de duplicar o conteúdo.

## O que ainda depende do Tiny

- Estoque e preços em tempo real (hoje são números fixos no mock).
- Badge "Novo"/"Mais Vendido" automático — a Tiny não tem esse conceito;
  só "Promoção" é derivado automaticamente (do preço promocional).
- Avaliações/notas de produto — não existem na Tiny; permanecem vazias
  para qualquer produto vindo de lá.
- Tudo isso já está documentado e sem bloqueio técnico — a aplicação
  funciona 100% com `DATA_SOURCE=mock` enquanto a Tiny não for
  homologada (ver [SPRINT_5_REPORT.md](./SPRINT_5_REPORT.md) para o
  checklist de homologação real, quando o suporte da Olist/Tiny for
  confirmado).

## O que depende apenas de conteúdo (não de código)

- Número de WhatsApp real (🔴 único item que bloqueia o lançamento).
- Domínio real + `NEXT_PUBLIC_SITE_URL`.
- Fotos reais dos produtos.
- Revisão final de copy/textos de produto com o time de produto, se
  desejado (o conteúdo atual já é realista e consistente, não é
  lorem ipsum, mas não é necessariamente a redação final aprovada pelo
  negócio).
- Texto do banner principal, se uma campanha específica for desejada.

## O MVP pode começar a receber produtos reais?

**Sim, com uma ressalva**: o catálogo, a estrutura de dados e a
documentação de importação estão prontos — qualquer produto cadastrado
seguindo o [PRODUCT_CATALOG_GUIDE.md](./PRODUCT_CATALOG_GUIDE.md)
funciona corretamente no app hoje (via edição direta do mock) e
continuará funcionando sem retrabalho quando a Tiny for ativada. A
única barreira real para receber **pedidos** de clientes de verdade é o
número de WhatsApp, que é uma troca de configuração, não uma tarefa de
desenvolvimento.

## Resultado de lint, testes e build

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 erros |
| `npm run test` | ✅ 199/199 (sem testes novos — nenhuma lógica de código foi alterada nesta sprint, só um comentário e documentação) |
| `npm run build` | ✅ compila, 24 rotas |

## Arquivos criados

`docs/PRODUCT_CATALOG_GUIDE.md`, `docs/PRODUCTION_CHECKLIST.md`,
`docs/SPRINT_13_REPORT.md`.

## Arquivos alterados

`src/lib/config.ts` (comentário), `docs/DELIVERY.md`, `docs/ROADMAP.md`,
`docs/CHANGELOG.md`.
