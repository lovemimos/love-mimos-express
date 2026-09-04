# Fase 2 — somente Preview

Não fazer merge nem promover antes da aprovação visual do usuário.

## Interface e catálogo

- Paleta: rosa #C6376B, rosa suave #FBE9EF, branco #FFFFFF, contraste #211D20.
- Fraunces nos títulos; Plus Jakarta Sans na interface; raio 16–28 px, foco visível, alvos de toque de pelo menos 44 px nos controles novos.
- Home consulta 12 itens disponíveis. Catálogo completo permanece na busca paginada, com departamento Todos por padrão, sem a combinação implícita incorreta Lash + Nail.
- Recomendações usam amostra limitada disponível, não o catálogo integral. Não são ranking de vendas.
- Não rotular itens como Mais vendidos ou Novidades sem dados que comprovem essa classificação. A seção equivalente é Disponíveis para você.
- Preço, variantes, estoque e validação server-side do WhatsApp preservados.
- Nenhuma regra de frete, prazo, parcelamento ou troca inventada. Condições são consultadas com a loja.

## Auditoria somente leitura — 04/09/2026

279 produtos visíveis. Sete sem imagem, sendo dois disponíveis:

- COLA LASHES CO PURE++ 5ML: estoque 9.
- Iluminador Led Tomate: estoque 5.
- boneca treino; Cílios DeceMars 6D - Fio Aberto Volume Egípcio; Mini kit retenção Cherry; Plástico filme; Pulseira para pinça anti queda: esgotados.

60 descrições ausentes no PostgreSQL. Os últimos 20 registros de sincronização não mantêm os detalhes brutos dos produtos concluídos: o cache é limpo após cada item. O token Tiny de Production não foi recuperável pela API autenticada de ambiente; nenhuma rotação foi feita. Portanto, essa auditoria não prova ausência no Tiny. Pendência: confronto com os detalhes atuais do Tiny, sem consumir as filas de atualização. Nenhuma descrição ou foto foi inventada.

A importação usa descricao_complementar, com fallback para descricao; as imagens vêm do scanner existente. A taxonomia manual é preservada deliberadamente em atualizações. Há colas na categoria Cílios e cinco produtos Cherry sem marca Cherry; corrigir esses cadastros requer conferência, não inferência pelo nome. Variantes semelhantes com Tiny IDs diferentes não devem ser fundidas automaticamente.

## Automação

Execuções reais schedule: 33841757839 e 33860981187, ambas success. A última fez seis lotes PARTIAL e terminou SUCCESS no sétimo, processando 160 itens nessa execução. O registro retomado terminou com processed=315 e errors=0 às 10:12:37 UTC.

O cron está configurado em 7,17,27,37,47,57 de cada hora. Os disparos observados ficaram separados por horas; não há evidência de uma cadência efetiva de dez minutos. Nenhuma configuração de Production foi alterada nesta fase.

## Verificação do primeiro Preview

- READY: 0925841. APIs de produtos, categorias, marcas, departamentos e status: HTTP 200.
- Nail Designer: 78 produtos; telas 360, 375, 390, 430 e 1440 px sem overflow global em Home, busca, produto e carrinho.
- Galeria ampliada abre/fecha; testes A–H de preço, estoque, persistência e WhatsApp passaram com produtos reais. Nenhum pedido enviado.
- Home antes: quatro requests de produtos, 750971 bytes descomprimidos, consulta principal 3508 ms.
- Home depois: um request, 29903 bytes descomprimidos, 2828 ms. Redução de payload ~96%; latência é amostra de laboratório, não garantia.
- Sem exceções JavaScript nem HTTP 5xx no ensaio. Ícone SVG, robots e sitemap respondem 200.
