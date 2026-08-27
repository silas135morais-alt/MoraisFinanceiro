# Relatório de auditoria completa — MoraisFinanceiro

**Data:** 27 de agosto de 2026  
**Escopo:** Resumo, Contas, Diagnóstico, Receitas, Despesas, ganhos da 99, APIs mensais, ajustes de abertura e fechamento mensal.  
**Resultado:** as inconsistências de cálculo identificadas nesta etapa foram corrigidas; a validação estática passou, enquanto a validação que depende de banco foi limitada pela ausência de `DATABASE_URL` no sandbox.

## Síntese executiva

A auditoria confirmou que a aplicação possui uma fonte unificada de movimentações em `Transaction`, e que o saldo das contas já exclui lançamentos futuros recorrentes e incorpora o ajuste de abertura apenas no mês selecionado. O valor reconciliado de agosto de 2026 permanece **R$ 172,64**, conforme o contexto operacional registrado.

Foram encontradas duas divergências relevantes no Diagnóstico. A primeira era o uso exclusivo de `date` para localizar receitas pagas; isso podia excluir receitas corrigidas ou recebidas em data posterior quando o `paidAt` estivesse no mês selecionado. A segunda era a consideração apenas do status `PENDING` para recebimentos futuros; receitas `OVERDUE`, embora ainda não recebidas, ficavam fora da projeção. Ambas foram alinhadas à regra do Resumo.

Também foi identificado um risco de interpretação: o Diagnóstico era apresentado como “próximos 30 dias”, embora o backend calculasse compromissos dentro do mês selecionado. A interface foi ajustada para declarar explicitamente a regra mensal, evitando que o usuário tome decisões com base em uma janela diferente da calculada.

## Correções aplicadas

| Área | Achado | Correção | Efeito esperado |
|---|---|---|---|
| Diagnóstico | Receitas pagas filtradas por `date`, ignorando `paidAt` | O filtro passou a priorizar `paidAt` e usar `date`/`dueDate` apenas como fallback quando `paidAt` é nulo | Receitas corrigidas ou recebidas no mês aparecem no mesmo período do Resumo |
| Diagnóstico | Receitas vencidas não entravam em “recebimentos previstos” | Status futuro alterado de apenas `PENDING` para `PENDING` e `OVERDUE` | A projeção não subestima valores ainda não recebidos |
| API `/api/diagnostico` | Parsing mensal ad-hoc com `new Date` | Uso de `firstParam` e `monthParamToDate` | Mesmo contrato UTC e mesma validação das demais telas |
| API `/api/motorista-99/realizado` | Parsing mensal ad-hoc | Uso do helper mensal compartilhado | Ganhos da 99 respeitam o mesmo mês em que o usuário está navegando |
| Diagnóstico — UX | Texto afirmava janela móvel de 30 dias | Textos alterados para “mês selecionado” e “período” | Menor risco de interpretação incorreta |
| Fechamento | O ajuste inicial não era levado para o ciclo seguinte | Ajustes de abertura são copiados para o próximo mês após confirmação, de forma idempotente | O saldo de agosto pode ser carregado para setembro sem duplicação |
| Fechamento | Possível colisão com ajuste manual no mês seguinte | Registro existente só é atualizado quando possui marcador de carry-over; ajuste manual não é sobrescrito | Preservação da intervenção do usuário |

## Regras de consistência verificadas

O **Resumo** calcula o saldo mensal com as transações pagas no período, receitas recebidas, despesas e demais saídas, somando o ajuste de abertura do mês. A projeção adiciona receitas e despesas pendentes ou vencidas do mesmo período. O **Diagnóstico** agora utiliza a mesma semântica de datas para receitas pagas e para compromissos futuros, embora mantenha seus campos próprios de projeção e dívidas pessoais.

A tela **Contas** utiliza `accountService.listWithBalances`, que soma o saldo inicial da conta, o ajuste mensal selecionado e movimentações pagas vinculadas à conta. Lançamentos futuros recorrentes não entram no saldo realizado. A tela **Contas a pagar** e **Contas a receber** continuam sendo telas operacionais, deliberadamente baseadas em hoje, próximos dias e restante do ciclo corrente; essa regra é explicitada na própria interface e não deve ser confundida com o seletor mensal do Resumo.

Os lançamentos da **99** continuam aceitando múltiplos registros na mesma data. O custo de gasolina permanece vinculado de forma idempotente ao lançamento correspondente, reduzindo o saldo e aparecendo em Despesas sem duplicação quando o ganho é corrigido ou excluído.

## Fechamento mensal e carry-over

A confirmação do fechamento continua preservando lançamentos históricos, copiando orçamentos e preparando recorrências, assinaturas e financiamentos. A nova etapa copia os ajustes de abertura existentes para o próximo mês dentro da mesma transação que marca o mês como fechado e grava o histórico do fechamento.

A cópia não cria registros repetidos em uma nova confirmação porque o fechamento possui chave única por usuário e mês. Além disso, a chave única do ajuste por usuário, mês e conta impede duplicação por conta. Ajustes manuais que já existirem no mês seguinte são preservados; apenas registros identificados pelo marcador interno de carry-over são atualizados.

> Importante: o carry-over é executado quando o usuário confirma o fechamento. Enquanto agosto permanecer aberto, setembro não deve receber automaticamente o ajuste de agosto. Esse comportamento mantém a confirmação como o ponto de transição do ciclo.

## Validações executadas

| Verificação | Resultado |
|---|---|
| Testes de contrato (`npm test`) | **26 passaram, 0 falharam** |
| ESLint (`npm run lint`) | **Passou** |
| TypeScript (`npm run typecheck`) | **Passou** |
| Build Next.js (`npx next build`) | **Passou**, com rotas compiladas e listadas |
| Build completo (`npm run build`) | Não executou até o Next.js porque o sandbox não possui `DATABASE_URL` |
| Prisma validate | Bloqueado pela mesma ausência de `DATABASE_URL`; não foi reportado erro estrutural do schema nessa execução |
| `git diff --check` | **Passou**, sem erros de whitespace |

Os testes cobrem, entre outros pontos, múltiplos lançamentos da 99 na mesma data, combustível idempotente, escopo mensal de ajustes, exclusão de recorrências futuras do saldo, projeção mensal e idempotência do fechamento.

## Pontos que devem ser verificados no ambiente de produção

A validação final de banco deve ser executada no ambiente que possui `DATABASE_URL`, usando a migração de múltiplos ganhos da 99 e a migração de ajustes mensais já presentes no repositório. Recomenda-se confirmar no painel de produção que agosto de 2026 continua mostrando R$ 172,64, que setembro permanece sem carry-over enquanto agosto estiver aberto e que, após a confirmação, o ajuste aparece apenas uma vez em setembro.

Também é recomendável realizar um teste funcional controlado: criar duas entradas da 99 no mesmo dia, registrar combustível em uma delas, corrigir o valor do ganho e verificar simultaneamente Resumo, Contas, Diagnóstico e Despesas. Esse teste deve ser feito antes de alterar dados financeiros reais adicionais.

## Conclusão

A auditoria encontrou e corrigiu as últimas divergências concretas entre Diagnóstico, APIs mensais e fechamento. O aplicativo está consistente no código e passou pelos testes, lint, typecheck e build Next.js. A única limitação de validação é operacional: o sandbox não possui conexão de banco para executar `prisma migrate deploy` e `prisma validate`. A publicação dessas alterações deve ser seguida por uma conferência autenticada no ambiente de produção, especialmente no fluxo de confirmação do fechamento de agosto para setembro.

**Autor:** Manus AI

## Referências internas

[1]: ../src/services/dashboard-service.ts — agregador canônico do Resumo  
[2]: ../src/services/diagnostic-service.ts — cálculo do Diagnóstico  
[3]: ../src/services/account-service.ts — saldos por conta e ajuste mensal  
[4]: ../src/services/month-closing-service.ts — preview e confirmação do fechamento  
[5]: ../src/lib/month-param.ts — contrato compartilhado de parsing mensal  
[6]: ../tests/finance-contracts.test.mjs — testes de contrato do aplicativo
