import type { ReactNode } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CreditCard, Landmark, LineChart, Wallet } from "lucide-react";

import { auth } from "@/auth";
import { DashboardChart } from "@/components/shared/dashboard-chart";
import { MonthSelector } from "@/components/shared/month-selector";
import { ProgressRow } from "@/components/shared/progress-row";
import { SummaryCard } from "@/components/shared/summary-card";
import { currency, shortDate } from "@/lib/format";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { getDashboard } from "@/services/dashboard-service";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  const params = (await searchParams) ?? {};
  const selectedDate = monthParamToDate(firstParam(params.month));
  const firstName = session?.user?.name?.split(" ")[0] ?? "Usuario";
  const dashboard = await getDashboard(session?.user?.id ?? "", selectedDate);
  const cards = [
    { title: "Saldo Atual", value: currency(dashboard.summary.balance), helper: "Saldo realizado ate hoje", icon: Wallet, tone: "emerald" },
    { title: "Receitas", value: currency(dashboard.summary.incomes), helper: "Receitas do mes", icon: ArrowUpRight, tone: "blue" },
    { title: "Despesas", value: currency(dashboard.summary.expenses), helper: "Compromissos do mes", icon: ArrowDownRight, tone: "rose" },
    { title: "Resultado realizado", value: currency(dashboard.summary.realizedMonth), helper: "Recebido - pago no mes", icon: Wallet, tone: "emerald" },
    { title: "Cartoes", value: currency(dashboard.summary.cards), helper: "Limite comprometido", icon: CreditCard, tone: "amber" },
    { title: "Investimentos", value: currency(dashboard.summary.investments), helper: "Carteira consolidada", icon: LineChart, tone: "violet" },
    { title: "Patrimonio", value: currency(dashboard.summary.netWorth), helper: "Visao consolidada", icon: Landmark, tone: "slate" },
    { title: "Vencendo", value: String(dashboard.summary.dueSoon), helper: "Contas proximas", icon: CalendarClock, tone: "blue" },
    { title: "Atrasadas", value: String(dashboard.summary.overdue), helper: "Exigem atencao", icon: AlertTriangle, tone: "rose" },
    { title: "Saldo previsto", value: currency(dashboard.summary.projectedBalance), helper: "Proximos 30 dias", icon: Wallet, tone: "emerald" },
    { title: "Receitas futuras", value: currency(dashboard.summary.futureIncomes), helper: "Proximos 30 dias", icon: ArrowUpRight, tone: "blue" },
    { title: "Despesas futuras", value: currency(dashboard.summary.futureExpenses), helper: "Proximos 30 dias", icon: ArrowDownRight, tone: "amber" },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-subtle rounded-lg border p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Resumo financeiro
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Bom te ver, {firstName}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Uma visao executiva do mes, com saldos, compromissos e metas em um painel
              limpo para tomada de decisao.
            </p>
          </div>
          <MonthSelector />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardChart
            title="Fluxo de Caixa"
            subtitle="Entradas e saidas consolidadas no mes"
            data={dashboard.charts.cashFlow}
            variant="line"
          />
        </div>
        <DashboardChart
          title="Receitas x Despesas"
          subtitle="Comparativo por semana"
          data={dashboard.charts.incomeExpense}
        />
      </section>

      <DashboardChart
        title="Evolucao Patrimonial"
        subtitle="Tendencia de crescimento acumulado"
        data={dashboard.charts.wealthEvolution}
        variant="line"
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Proximos vencimentos">
          {dashboard.upcoming.map((bill) => (
            <ListItem key={bill.id} title={bill.title} meta={shortDate(bill.dueDate)} value={currency(Number(bill.amount))} />
          ))}
        </Panel>

        <Panel title="Ultimos lancamentos">
          {dashboard.latest.map((entry) => (
            <ListItem
              key={entry.id}
              title={entry.title}
              meta={`${entry.category?.name ?? "Sem categoria"} - ${shortDate(entry.date)}`}
              value={currency(Number(entry.amount))}
            />
          ))}
        </Panel>

        <Panel title="Metas financeiras">
          <div className="space-y-3">
            {dashboard.budgets.map((budget) => (
              <ProgressRow
                key={budget.id}
                title={budget.category.name}
                current={currency(0)}
                target={currency(Number(budget.limit))}
                progress={0}
              />
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h3 className="font-semibold tracking-normal">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ListItem({ title, meta, value }: { title: string; meta: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-secondary/55 px-3 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
