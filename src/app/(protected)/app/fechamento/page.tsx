import { ArrowDownRight, ArrowUpRight, CalendarCheck2, CircleAlert, Copy, Fuel, LockKeyhole, WalletCards } from "lucide-react";

import { closeMonthAction } from "@/actions/operational-actions";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { monthClosingService } from "@/services/month-closing-service";
import { ensureUserWorkspace } from "@/services/workspace-service";

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function integer(value: number) {
  return value.toLocaleString("pt-BR");
}

export default async function FechamentoPage() {
  const userId = await requireUserId();
  await ensureUserWorkspace(userId);
  const month = await prisma.month.findFirst({
    where: { userId, status: "OPEN" },
    orderBy: { startsAt: "desc" },
  });
  const preview = month ? await monthClosingService.preview(userId, month.id) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fechamento mensal"
        title={preview ? `Conferência de ${preview.month.label}` : "Resumo antes da confirmação"}
        description="Consolide o mês sem apagar lançamentos. Depois da confirmação, o período fica registrado e o próximo mês é preparado automaticamente."
      />

      {preview ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Entradas do mês" value={currency(preview.totals.incomeTotal)} helper={`${currency(preview.totals.incomeReceived)} recebidos · ${currency(preview.totals.incomePending)} pendentes`} icon={ArrowUpRight} tone="green" />
            <SummaryCard title="Despesas do mês" value={currency(preview.totals.expenseTotal)} helper={`${currency(preview.totals.expensePaid)} pagas · ${currency(preview.totals.expensePending)} pendentes`} icon={ArrowDownRight} tone="rose" />
            <SummaryCard title="Sobra realizada" value={currency(preview.totals.realizedSurplus)} helper={`Projeção do mês: ${currency(preview.totals.projectedSurplus)}`} icon={WalletCards} tone={preview.totals.realizedSurplus >= 0 ? "blue" : "amber"} />
            <SummaryCard title="Pendências" value={integer(preview.pending.totalCount)} helper={`${preview.pending.incomeCount} a receber · ${preview.pending.expenseCount} a pagar`} icon={CircleAlert} tone={preview.pending.totalCount > 0 ? "amber" : "green"} />
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ganhos da 99</p>
                <h2 className="mt-1 text-xl font-semibold">Resultado do trabalho no mês</h2>
              </div>
              <Fuel className="size-5 text-amber-600" aria-hidden="true" />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div><p className="text-sm text-muted-foreground">Dias trabalhados</p><p className="mt-1 text-lg font-semibold">{integer(preview.driver.daysWorked)}</p></div>
              <div><p className="text-sm text-muted-foreground">Ganho bruto</p><p className="mt-1 text-lg font-semibold">{currency(preview.driver.grossTotal)}</p></div>
              <div><p className="text-sm text-muted-foreground">Gasolina</p><p className="mt-1 text-lg font-semibold text-amber-700">{currency(preview.driver.fuelTotal)}</p></div>
              <div><p className="text-sm text-muted-foreground">Lucro líquido</p><p className="mt-1 text-lg font-semibold text-emerald-700">{currency(preview.driver.netTotal)}</p></div>
              <div><p className="text-sm text-muted-foreground">Diferença da meta</p><p className="mt-1 text-lg font-semibold">{currency(preview.driver.difference)}</p></div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2"><CalendarCheck2 className="size-5 text-primary" aria-hidden="true" /><h2 className="font-semibold">O que será preservado</h2></div>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <p><strong className="text-foreground">{integer(preview.willCopy.recurring)}</strong> recorrências ativas</p>
                <p><strong className="text-foreground">{integer(preview.willCopy.subscriptions)}</strong> assinaturas</p>
                <p><strong className="text-foreground">{integer(preview.willCopy.financings)}</strong> financiamentos</p>
                <p><strong className="text-foreground">{integer(preview.willCopy.budgets)}</strong> orçamentos do mês</p>
                <p><strong className="text-foreground">{integer(preview.willCopy.cards)}</strong> cartões ativos</p>
                <p><strong className="text-foreground">{integer(preview.willCopy.categories)}</strong> categorias ativas</p>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/20">
              <div className="flex items-center gap-2"><LockKeyhole className="size-5 text-amber-700" aria-hidden="true" /><h2 className="font-semibold">O que não será apagado</h2></div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Os {integer(preview.willNotCopy.oneTimeIncomesAndExpenses)} lançamentos do mês continuarão disponíveis no histórico. Contas pendentes e atrasadas também permanecem visíveis para acompanhamento.</p>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Confirmar fechamento de {preview.month.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">O mês será marcado como fechado, o saldo será levado para o próximo ciclo e as recorrências serão preparadas sem duplicar lançamentos avulsos.</p>
              </div>
              <form action={closeMonthAction.bind(null, preview.month.id)}>
                <Button type="submit"><Copy className="mr-2 size-4" aria-hidden="true" />Confirmar fechamento</Button>
              </form>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
          Nenhum mês aberto encontrado.
        </section>
      )}
    </div>
  );
}
