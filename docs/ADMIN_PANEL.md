# Painel Administrativo — Proposta (não implementado)

> Volta para [PROJECT_VISION.md](./PROJECT_VISION.md). Assim como
> [AI_ASSISTANT.md](./AI_ASSISTANT.md), este é um documento de proposta —
> não existe painel admin no código hoje.

## 1. Problema que resolveria

Hoje, editar o catálogo significa editar código diretamente
(`src/lib/data/products.ts`, `src/lib/data/categories.ts`) e fazer um novo deploy.
Isso é aceitável enquanto:

- O catálogo é pequeno (12 produtos) e muda pouco.
- Quem mantém o app tem confortável acesso a Git/deploy.

Deixa de ser aceitável no momento em que a Fase 2 do
[ROADMAP.md](./ROADMAP.md) acontecer (integração com a Tiny ERP) — porque
aí o catálogo passa a ser gerenciado *na própria Tiny*, e "editar o
código" deixa de ser sequer a forma certa de mudar um produto. Ou seja: a
necessidade de um painel administrativo separado pode nunca aparecer, se a
Tiny já cobrir esse papel.

## 2. Quando isso faria sentido (e quando não)

**Faria sentido** se o catálogo de produtos continuar sendo mantido fora
da Tiny (ex.: a loja decide não migrar pra Tiny, ou usa a Tiny só para
estoque/fiscal mas quer controlar preço/descrição/fotos por outro lugar).
Nesse caso, um painel simples de CRUD de produtos evitaria depender de
deploy de código para mudanças de rotina.

**Não faria sentido** duplicar esforço criando um painel administrativo
completo se a Fase 2 ([API_TINY.md](./API_TINY.md)) for adiante — a Tiny
já é o painel administrativo do catálogo nesse cenário, e a Love Mimos
Express só consome os dados.

## 3. Esboço de escopo mínimo, se for construído

Caso decida seguir sem depender só da Tiny:

- **Autenticação simples** (só para a equipe da loja, não para clientes —
  ver [PROJECT_VISION.md](./PROJECT_VISION.md) sobre login de cliente
  continuar fora de escopo).
- **CRUD de produtos**: nome, descrição, preço, preço promocional,
  estoque, categoria, variações, imagens, badge (`novo`/`mais-vendido`/
  `promocao`).
- **CRUD de categorias**.
- **Sem** gestão de pedidos dentro do painel — pedidos continuam
  fechados via WhatsApp (ver decisão de escopo em
  [PROJECT_VISION.md](./PROJECT_VISION.md)); construir gestão de pedidos
  aqui só faria sentido se a Fase 4 do roadmap (criar pedido
  automaticamente no Tiny) avançar.

## 4. Onde isso viveria tecnicamente

- Precisaria de um banco de dados real (hoje o catálogo é só arquivos
  TypeScript estáticos) — ex.: Postgres via Vercel Postgres/Supabase, ou
  qualquer solução gerenciada compatível com o deploy escolhido.
- Rotas de admin protegidas em `app/admin/**`, fora do fluxo público da
  loja, reaproveitando o mesmo tipo `Product` de `src/types/index.ts` como
  contrato — igual à estratégia já usada para a integração Tiny, o
  objetivo é sempre ter uma única fonte de verdade de schema.

## 5. Decisão recomendada por agora

Não construir. Esperar a Fase 2 (Tiny) resolver a maior parte da dor de
"editar catálogo sem deploy" antes de justificar um painel administrativo
próprio — que é esforço de manutenção duplicado se a Tiny já fizer esse
papel.
