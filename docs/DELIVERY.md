# Entrega — Love Mimos Express

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md)

## 1. O que está sendo entregue

Um projeto Next.js 14 (App Router) + TypeScript + Tailwind CSS completo e
funcional, com:

- Home (modular, em seções independentes), Busca, Detalhe de Produto,
  Carrinho, Favoritos, e uma página de diagnóstico interno
  (`/dev/tiny-status`, invisível em produção) — ver inventário completo
  em [PROJECT_VISION.md §6](./PROJECT_VISION.md#6-inventário-de-telas-estado-atual)
- Catálogo mock com 12 produtos reais de lash design em 6 categorias
  (revisado quanto a consistência na Sprint 13 — ver
  [PRODUCT_CATALOG_GUIDE.md](./PRODUCT_CATALOG_GUIDE.md))
- Busca tolerante a acento/espaço/caixa, com estado na URL
- Carrinho e favoritos persistentes (localStorage), com recuperação
  segura de dados corrompidos
- Motor de recomendações baseado em regras (não IA), em Home/Produto/Carrinho
- Checkout via link oficial do WhatsApp, com mensagem completa
  (produtos, quantidade, subtotal, total, observação, nome da cliente,
  link do app) e tratamento de erro para popup bloqueado
- Design system aplicado de ponta a ponta (ver
  [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md))
- Código organizado para receber a integração com a Tiny ERP sem
  reescrever telas (ver [API_TINY.md](./API_TINY.md))

## 2. O que foi verificado antes da entrega

Rodado localmente neste ambiente de desenvolvimento (não em produção):

| Verificação | Comando | Resultado |
|---|---|---|
| Build de produção | `npm run build` | ✅ compila, 24 rotas geradas |
| Lint | `npm run lint` | ✅ 0 warnings, 0 erros |
| Testes automatizados | `npm run test` | ✅ ver [CHANGELOG.md](./CHANGELOG.md) para a contagem mais recente |
| Servidor + rotas | `npm start` + requisições a todas as rotas existentes | ✅ todas HTTP 200 |
| Slug de produto inválido / rota inexistente | `/produto/nao-existe`, rota qualquer | ✅ HTTP 404 (página customizada, ver Sprint 11) |

Histórico detalhado de correções feitas durante essa validação em
[CHANGELOG.md](./CHANGELOG.md). Auditoria completa de todos os fluxos em
[GO_LIVE_REPORT.md](./GO_LIVE_REPORT.md) (Sprint 12).

**O que isso não cobre**: teste em dispositivo físico real, teste de
performance sob carga, teste cross-browser além do motor usado durante o
desenvolvimento, e revisão de acessibilidade além das práticas já
aplicadas por padrão (contraste de cor, `focus-visible`, respeito a
`prefers-reduced-motion`).

## 3. Como rodar localmente

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000` — o layout é limitado a `max-w-md` mesmo em
desktop, para simular fielmente a experiência mobile (ver
[DESIGN_SYSTEM.md §11](./DESIGN_SYSTEM.md#mobile-first-sempre)).

## 4. Recomendação de deploy

O caminho mais direto para um projeto Next.js sem infraestrutura própria é
a **Vercel** (mesma empresa por trás do framework, zero configuração
adicional para App Router). Alternativas viáveis: qualquer plataforma que
suporte Node.js + build Next.js (Netlify, Railway, servidor próprio com
`next start`).

Nenhuma variável de ambiente é necessária na Fase 1 (catálogo mock). A
Fase 2 ([API_TINY.md](./API_TINY.md)) vai exigir `TINY_CLIENT_ID` e
`TINY_CLIENT_SECRET` como segredos de ambiente na plataforma escolhida.

## 5. Checklist antes de publicar para clientes reais

Ver [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) (Sprint 13) —
checklist completo e priorizado (WhatsApp, domínio, variáveis de
ambiente, Tiny, imagens, banners, SEO, testes finais).

## 6. Limitações conhecidas (por design, não bugs)

Estas não são pendências — são escolhas de escopo documentadas em
[PROJECT_VISION.md](./PROJECT_VISION.md) e [ROADMAP.md](./ROADMAP.md):

- Sem login de cliente
- Sem pagamento dentro do app
- Carrinho não sincroniza entre dispositivos (é por navegador)
- Estoque é um número fixo por produto até a integração com a Tiny

## 7. Suporte e continuidade

Toda decisão de arquitetura relevante está documentada com o "por quê" em
[PROJECT_VISION.md §5](./PROJECT_VISION.md#5-decisões-técnicas-e-por-quê) —
antes de reverter alguma escolha (ex.: trocar `<link>` de fontes por
`next/font/google`, trocar Zustand por outra lib de estado), vale checar
se já existe um motivo registrado.
