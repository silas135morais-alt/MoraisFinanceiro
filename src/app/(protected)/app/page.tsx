import type { ReactNode } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CreditCard, Landmark, LineChart, Wallet } from "lucide-react";

import { auth } from "@/auth";
import { DashboardChart } from "@/components/shared/dashboard-chart";
import { MonthSelector } from "@/components/shared/month-selector";
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
    { title: "Saldo do mes", value: currency(dashboard.summary.balance), helper: "Receitas - contas, faturas e aportes", icon: Wallet, tone: "emerald" },
    { title: "Entradas recebidas", value: currency(dashboard.summary.incomes), helper: "Receitas e resgates pagos", icon: ArrowUpRight, tone: "blue" },
    { title: "Saidas pagas", value: currency(dashboard.summary.paidOutflows), helper: "Contas, faturas e aportes", icon: ArrowDownRight, tone: "rose" },
    { title: "Fatura atual", value: currency(dashboard.summary.currentInvoice), helper: "Cartoes do mes selecionado", icon: CreditCard, tone: "amber" },
    { title: "Investimentos", value: currency(dashboard.summary.investments), helper: "Carteira consolidada", icon: LineChart, tone: "violet" },
    { title: "Patrimonio", value: currency(dashboard.summary.netWorth), helper: "Saldo + ativos - cartoes", icon: Landmark, tone: "slate" },
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

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <BalancePanel rows={dashboard.summary.balanceBreakdown} total={dashboard.summary.balance} />
        </div>
        <AccountBalancePanel accounts={dashboard.accounts} total={dashboard.summary.cashTotal} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <OperationsPanel
          dueSoon={dashboard.summary.dueSoon}
          overdue={dashboard.summary.overdue}
          projectedBalance={dashboard.summary.projectedBalance}
          futureIncomes={dashboard.summary.futureIncomes}
          futureExpenses={dashboard.summary.futureExpenses}
        />
        <DashboardChart
          title="Fluxo de Caixa"
          subtitle="Entradas e saidas consolidadas no mes"
          data={dashboard.charts.cashFlow}
          variant="line"
        />
      </section>

      <section>
        <DashboardChart
          title="Receitas x Despesas"
          subtitle="Comparativo por semana"
          data={dashboard.charts.incomeExpense}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Proximos vencimentos">
          {dashboard.upcoming.length ? (
            dashboard.upcoming.map((bill) => (
              bill.details?.length ? (
                <InvoiceListItem
                  key={bill.id}
                  details={bill.details}
                  meta={shortDate(bill.dueDate)}
                  title={bill.title}
                  value={currency(Number(bill.amount))}
                />
              ) : (
                <ListItem key={bill.id} title={bill.title} meta={shortDate(bill.dueDate)} value={currency(Number(bill.amount))} />
              )
            ))
          ) : (
            <EmptyText>Nenhuma conta vencendo neste mes.</EmptyText>
          )}
        </Panel>

        <Panel title="Extrato recente do mes">
          {dashboard.latest.length ? dashboard.latest.map((entry) => (
            <ListItem
              key={entry.id}
              title={entry.title}
              meta={`${entry.category?.name ?? "Sem categoria"} - ${shortDate(entry.date)}`}
              value={`${entry.type === "INCOME" ? "+" : "-"} ${currency(Number(entry.amount))}`}
            />
          )) : (
            <EmptyText>Nenhum lancamento encontrado no mes.</EmptyText>
          )}
        </Panel>
      </section>
    </div>
  );
}

function BalancePanel({
  rows,
  total,
}: {
  rows: Array<{ label: string; amount: number; kind: string }>;
  total: number;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold tracking-normal">Composicao do saldo</h3>
          <p className="mt-1 text-sm text-muted-foreground">O que entrou e saiu do seu dinheiro neste mes.</p>
        </div>
        <p className="text-2xl font-semibold">{currency(total)}</p>
      </div>
      <div className="mt-5 divide-y rounded-lg border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className={row.kind === "in" ? "font-semibold text-emerald-600 dark:text-emerald-300" : "font-semibold text-rose-600 dark:text-rose-300"}>
              {row.kind === "in" ? "+" : "-"} {currency(row.amount)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 bg-secondary/55 px-4 py-3 text-sm font-semibold">
          <span>Saldo final do mes</span>
          <span>{currency(total)}</span>
        </div>
      </div>
    </section>
  );
}

function OperationsPanel({
  dueSoon,
  overdue,
  projectedBalance,
  futureIncomes,
  futureExpenses,
}: {
  dueSoon: number;
  overdue: number;
  projectedBalance: number;
  futureIncomes: number;
  futureExpenses: number;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h3 className="font-semibold tracking-normal">Operacao do mes</h3>
      <div className="mt-4 grid gap-3">
        <Metric icon={<CalendarClock className="size-4" />} label="Vencendo" value={`${dueSoon} conta(s)`} />
        <Metric icon={<AlertTriangle className="size-4" />} label="Atrasadas" value={`${overdue} conta(s)`} />
        <Metric icon={<Wallet className="size-4" />} label="Saldo previsto" value={currency(projectedBalance)} />
        <Metric icon={<ArrowUpRight className="size-4" />} label="Receitas futuras" value={currency(futureIncomes)} />
        <Metric icon={<ArrowDownRight className="size-4" />} label="Despesas futuras" value={currency(futureExpenses)} />
      </div>
    </section>
  );
}

function AccountBalancePanel({
  accounts,
  total,
}: {
  accounts: Array<{ id: string; name: string; institution: string | null; color: string; balance: number }>;
  total: number;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-normal">Dinheiro por conta</h3>
          <p className="mt-1 text-sm text-muted-foreground">Quanto voce tem separado em cada banco ou carteira.</p>
        </div>
        <p className="text-lg font-semibold">{currency(total)}</p>
      </div>
      <div className="mt-5 space-y-3">
        {accounts.length ? (
          accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-4 rounded-lg bg-secondary/55 px-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{account.institution ?? "Conta financeira"}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold">{currency(account.balance)}</p>
            </div>
          ))
        ) : (
          <EmptyText>Nenhuma conta cadastrada.</EmptyText>
        )}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-secondary/55 px-3 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
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

function InvoiceListItem({
  title,
  meta,
  value,
  details,
}: {
  title: string;
  meta: string;
  value: string;
  details: { id: string; title: string; amount: unknown }[];
}) {
  return (
    <details className="rounded-lg bg-secondary/55 px-3 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {meta} - {details.length} compra(s)
          </p>
        </div>
        <p className="text-sm font-semibold">{value}</p>
      </summary>
      <div className="mt-3 space-y-2 border-t pt-3">
        {details.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{item.title}</span>
            <span className="font-semibold">{currency(Number(item.amount))}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-secondary/55 px-3 py-4 text-sm text-muted-foreground">{children}</p>;
}
