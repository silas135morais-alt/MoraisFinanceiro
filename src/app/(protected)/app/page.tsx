import type { ReactNode } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CreditCard, Landmark, LineChart, Wallet } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { DashboardChart } from "@/components/shared/dashboard-chart";
import { MonthSelector } from "@/components/shared/month-selector";
import { MonthlyOpeningAdjustmentPanel } from "./monthly-opening-adjustment-panel";
import { SummaryCard } from "@/components/shared/summary-card";
import { currency, shortDate } from "@/lib/format";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { getDashboard } from "@/services/dashboard-service";
import { getFinancialDiagnostic } from "@/services/diagnostic-service";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  const params = (await searchParams) ?? {};
  const selectedDate = monthParamToDate(firstParam(params.month));
  const firstName = session?.user?.name?.split(" ")[0] ?? "Usuario";
  const [dashboard, diagnostic] = await Promise.all([
    getDashboard(session?.user?.id ?? "", selectedDate),
    getFinancialDiagnostic(session?.user?.id ?? "", selectedDate),
  ]);
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

      <MonthlyPulse
        futureExpenses={dashboard.summary.futureExpenses}
        futureIncomes={dashboard.summary.futureIncomes}
        paidOutflows={dashboard.summary.paidOutflows}
        projectedBalance={dashboard.summary.projectedBalance}
        receivedIncomes={dashboard.summary.incomes}
        currentInvoice={dashboard.summary.currentInvoice}
      />

      <MonthlyOpeningAdjustmentPanel
        month={`${selectedDate.getUTCFullYear()}-${String(selectedDate.getUTCMonth() + 1).padStart(2, "0")}`}
        accounts={dashboard.accounts.map((account: { id: string; name: string }) => ({ id: account.id, name: account.name }))}
        adjustments={dashboard.openingAdjustments}
      />

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

      <DiagnosticSummaryPanel diagnostic={diagnostic} />

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
              href={entry.type === "INCOME" ? (entry.title.includes("99") ? "/app/receitas?q=99" : "/app/receitas") : entry.type === "CREDIT_CARD_PURCHASE" ? "/app/cartoes" : "/app/despesas"}
            />
          )) : (
            <EmptyText>Nenhum lancamento encontrado no mes.</EmptyText>
          )}
        </Panel>
      </section>
    </div>
  );
}

function MonthlyPulse({ futureExpenses, futureIncomes, paidOutflows, projectedBalance, receivedIncomes, currentInvoice }: { futureExpenses: number; futureIncomes: number; paidOutflows: number; projectedBalance: number; receivedIncomes: number; currentInvoice: number }) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Visão rápida</p><h3 className="mt-1 text-lg font-semibold">Como o mês está se comportando</h3></div>
        <p className="text-xs text-muted-foreground">Atualizado com os lançamentos do período selecionado</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <MiniDashboardStat label="Recebido" value={currency(receivedIncomes)} />
        <MiniDashboardStat label="A receber" value={currency(futureIncomes)} />
        <MiniDashboardStat label="Despesas" value={currency(paidOutflows + futureExpenses)} />
        <MiniDashboardStat label="Cartão" value={currency(currentInvoice)} />
        <MiniDashboardStat label="Saldo projetado" value={currency(projectedBalance)} />
      </div>
    </section>
  );
}

function DiagnosticSummaryPanel({ diagnostic }: { diagnostic: Awaited<ReturnType<typeof getFinancialDiagnostic>> }) {
  const priority = diagnostic.debts[0];
  const priorityDueDate = priority?.source === "PERSONAL_DEBT" ? priority.dueDate : priority?.nextDueDate;
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Diagnóstico</p><h3 className="mt-1 text-xl font-semibold">Seu caixa nos próximos 30 dias</h3></div>
        <Link href="/app/diagnostico" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Ver detalhes <ArrowUpRight className="size-4" /></Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><MiniDashboardStat label="Caixa projetado" value={currency(diagnostic.projectedCash30d)} /><MiniDashboardStat label="Disponível seguro" value={currency(diagnostic.safeCash30d)} /><MiniDashboardStat label="Dívida em aberto" value={currency(diagnostic.personalDebtBalance)} /></div>
      <p className="mt-4 text-sm text-muted-foreground">{priority ? <>Próxima prioridade: <strong className="text-foreground">{priority.source === "PERSONAL_DEBT" ? `${priority.creditor} — ${priority.title}` : priority.name}</strong>{priorityDueDate ? ` · ${shortDate(new Date(priorityDueDate))}` : ""}.</> : "Nenhuma dívida ou financiamento ativo."}</p>
    </section>
  );
}

function MiniDashboardStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
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
        <div className="text-right">
          <p className="text-lg font-semibold">{currency(total)}</p>
          <Link className="text-xs font-medium text-primary" href="/app/contas">
            Gerenciar
          </Link>
        </div>
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

function ListItem({ title, meta, value, href }: { title: string; meta: string; value: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-secondary/55 px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold">{value}</p>
        {href ? <Link href={href} className="text-[11px] font-semibold text-primary hover:underline">Abrir</Link> : null}
      </div>
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
