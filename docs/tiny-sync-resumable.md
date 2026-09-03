# Tiny sync resumível — operação e validação

O endpoint usa orçamento de 200 segundos e até 25 produtos por chamada.
Antes de cada tentativa HTTP reserva 20s para a resposta e 10s para persistir.
Retries também respeitam 2,1 segundos entre chamadas e backoff persistido.
Um produto com muitas variantes retoma respostas já recebidas, sem reiniciar a família.

## Persistência sem migração

O campo JSONB existente `TinySyncRun.errorSummary` contém um envelope versionado:
cursor, página, IDs, respostas parciais do Tiny, heartbeat (`updatedAt`), contadores
do lote, `hasMore`, `changedSince`, cooldown e histórico de falhas. Dados comerciais
intermediários nunca são retornados pelo endpoint público de status. Não há tokens
nesse envelope. Os contadores e histórico do registro anterior são preservados.

O lock tem lease de 10 minutos, heartbeat e token de proprietário. A aquisição é
atômica. O proprietário é conferido antes de salvar progresso e checkpoint.
Uma execução antiga RUNNING é retomada, usando os timestamps individuais gravados
pela versão antiga para excluir itens já concluídos. Uma falha após commit de um
produto, mas antes do cursor, pode repetir sua comparação: as chaves únicas e o
snapshot tornam essa repetição idempotente.

`lastTinySyncAt` só avança na transação final SUCCESS, usando o INÍCIO do ciclo
como checkpoint conservador. Não altera `Product.updatedAt` nos produtos iguais.
Execuções direcionadas por IDs/limit não avançam o checkpoint global.
A API Tiny v2 filtra por data, não por segundo; alterações do mesmo dia podem
reaparecer. Essa sobreposição é intencional para não perder mudanças.

Erros de identidade/API por produto são registrados e reprocessados em PARTIAL;
falhas de infraestrutura interrompem em ERROR, preservando cursor. Um próximo POST
retoma. Erros permanentes exigem diagnóstico; não são falsamente marcados SUCCESS.

## Porta de publicação

Antes de ativar o workflow, validar em Preview: recuperar o RUNNING órfão, chamadas
abaixo de 300s, PARTIAL até SUCCESS, segundo ciclo sem duplicidade, catálogo 200 e
runtime sem 504. Os testes unitários NÃO substituem essa validação com Tiny real.

Após validar, copiar `docs/tiny-sync-workflow.yml.example` para
`.github/workflows/tiny-sync.yml`. O template não está ativo. Ele usa dez minutos,
no máximo dez lotes por execução, trava de concorrência e workflow_dispatch.
GitHub Actions pode atrasar schedules; não oferece garantia de latência de dez minutos.
O cron Vercel diário existente permanece inalterado como fallback.

Cadastrar `TINY_SYNC_SECRET` no GitHub com o mesmo valor da Vercel Production.
Se Deployment Protection estiver habilitado, cadastrar também
`VERCEL_AUTOMATION_BYPASS_SECRET`; não desabilitar a proteção.
POST com `Authorization: Bearer <TINY_SYNC_SECRET>`, JSON `{}`.
GET do cron continua autenticado com `CRON_SECRET`.
Não imprimir headers, corpo bruto de erros ou valores de secrets.
