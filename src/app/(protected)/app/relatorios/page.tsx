import { Download, FileText } from "lucide-react";

import { DashboardChart } from "@/components/shared/dashboard-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-guard";
import { addMonths } from "@/lib/date-range";
import { dateToMonthParam, firstParam, monthParamToDate } from "@/lib/month-param";
import { currency } from "@/lib/format";
import { getDashboard } from "@/services/dashboard-service";

type RelatoriosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RelatoriosPage({ searchParams }: RelatoriosPageProps) {
  const params = (await searchParams) ?? {};
  const selectedMonth = firstParam(params.month) ?? dateToMonthParam(new Date());
  const userId = await requireUserId();
  const selectedDate = monthParamToDate(selectedMonth);
  const previousMonth = dateToMonthParam(addMonths(selectedDate, -1));
  const [dashboard, previousDashboard] = await Promise.all([
    getDashboard(userId, selectedDate),
    getDashboard(userId, monthParamToDate(previousMonth)),
  ]);
  const comparisons = [
    { label: "Receitas recebidas", current: dashboard.summary.incomeReceived, previous: previousDashboard.summary.incomeReceived },
    { label: "Despesas pagas", current: dashboard.summary.paidExpenses, previous: previousDashboard.summary.paidExpenses },
    { label: "Faturas pagas", current: dashboard.summary.paidCards, previous: previousDashboard.summary.paidCards },
    { label: "Saldo realizado", current: dashboard.summary.realizedMonth, previous: previousDashboard.summary.realizedMonth },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatórios"
        title="Análises e comparativos"
        description="Gráficos, comparações e exportação com base nos dados reais."
        actions={<Button asChild variant="outline"><a href={`/api/export?entity=reports&format=pdf&month=${encodeURIComponent(selectedMonth)}`}><Download className="size-4" />Exportar</a></Button>}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardChart title="Fluxo semanal da competência" subtitle="Entradas e saídas realizadas por semana" data={dashboard.charts.cashFlow} />
        <DashboardChart title="Composição do fluxo" subtitle="Receitas, despesas, faturas e aportes" data={dashboard.charts.incomeExpense} />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold">Comparativo com o mês anterior</p>
            <p className="text-sm text-muted-foreground">{previousMonth} × {selectedMonth}</p>
          </div>
          <div className="space-y-3">
            {comparisons.map((item) => {
              const delta = item.current - item.previous;
              const percent = item.previous === 0 ? null : (delta / Math.abs(item.previous)) * 100;
              return (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-right text-sm font-medium">
                    {currency(item.current)}
                    <span className={delta >= 0 ? "ml-2 text-emerald-600" : "ml-2 text-rose-600"}>
                      {percent === null ? "novo" : `${delta >= 0 ? "+" : ""}${percent.toFixed(1)}%`}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <EmptyState icon={FileText} title="Central de exportação" description="Relatórios disponíveis em PDF, CSV e planilhas para a competência selecionada." />
      </section>
    </div>
  );
}
