import { AlertTriangle, CheckCircle2, Clock, Landmark, Receipt } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { requireUserId } from "@/lib/auth-guard";
import { getMonthRange } from "@/lib/date-range";
import { todayInput } from "@/lib/date-input";
import { currency, shortDate } from "@/lib/format";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { resolveTransactionStatus, statusLabel } from "@/lib/transaction-status";
import { prisma } from "@/lib/prisma";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { ensureMonth } from "@/services/transaction-service";
import { getDriverProfile } from "@/services/driver-profile-service";
import { expenseService } from "@/services/expense-service";
import { personalDebtService, serializePersonalDebt } from "@/services/personal-debt-service";

import { BudgetBoard } from "../orcamentos/budget-board";
import { DebtBoard } from "../dividas/debt-board";
import { ExpenseCreateAction, ExpenseRowActions } from "./expense-actions";

const views = [
  { label: "Lançamentos", value: "entries" },
  { label: "Dívidas pessoais", value: "debts" },
  { label: "Planejamento", value: "planning" },
];

const typeTabs = [
  { label: "Todas", value: "" },
  { label: "Avulsas", value: "ONE_TIME" },
  { label: "Fixas", value: "FIXED" },
  { label: "Parceladas", value: "INSTALLMENT" },
  { label: "Assinaturas", value: "SUBSCRIPTION" },
  { label: "Financiamentos", value: "FINANCING" },
];

const typeLabels: Record<string, string> = {
  FINANCING: "Financiamento",
  FIXED: "Fixa",
  INSTALLMENT: "Parcelada",
  ONE_TIME: "Avulsa",
  SUBSCRIPTION: "Assinatura",
};

type DespesasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DespesasPage({ searchParams }: DespesasPageProps) {
  const userId = await requireUserId();
  const params = (await searchParams) ?? {};
  const selectedView = ["entries", "debts", "planning"].includes(firstParam(params.view) ?? "") ? (firstParam(params.view) as string) : "entries";
  const selectedType = firstParam(params.type) ?? "";
  const selectedDate = monthParamToDate(firstParam(params.month));
  const { startsAt, endsAt } = getMonthRange(selectedDate);
  const month = await ensureMonth(userId, selectedDate);

  const [data, monthlyData, categories, accounts, debts, budgets, planningTransactions, driverProfile] = await Promise.all([
    expenseService.list(userId, {
      pageSize: 20,
      q: firstParam(params.q),
      status: firstParam(params.status),
      type: selectedType || undefined,
      startDate: startsAt.toISOString(),
      endDate: endsAt.toISOString(),
    }),
    expenseService.list(userId, { pageSize: 200, startDate: startsAt.toISOString(), endDate: endsAt.toISOString() }),
    categoryService.list(userId, "EXPENSE"),
    accountService.list(userId),
    personalDebtService.list(userId),
    prisma.budget.findMany({ where: { userId, monthId: month.id }, include: { category: true }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({ where: { userId, type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] }, status: { not: "CANCELED" }, OR: [{ dueDate: { gte: startsAt, lte: endsAt } }, { dueDate: null, date: { gte: startsAt, lte: endsAt } }] }, select: { categoryId: true, amount: true } }),
    getDriverProfile(userId),
  ]);

  const monthlyTotal = monthlyData.items.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthlyPaid = monthlyData.items.filter((expense) => expense.status === "PAID").reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthlyPending = monthlyData.items.filter((expense) => resolveTransactionStatus(expense.status, expense.dueDate ?? expense.date) === "PENDING").reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthlyOverdue = monthlyData.items.filter((expense) => resolveTransactionStatus(expense.status, expense.dueDate ?? expense.date) === "OVERDUE").reduce((sum, expense) => sum + Number(expense.amount), 0);
  const accountOptions = accounts.map((account) => ({ id: account.id, name: account.name }));
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));
  const spentByCategory = new Map<string, number>();
  for (const transaction of planningTransactions) if (transaction.categoryId) spentByCategory.set(transaction.categoryId, (spentByCategory.get(transaction.categoryId) ?? 0) + transaction.amount.toNumber());
  const budgetRows = budgets.map((budget) => ({ id: budget.id, categoryId: budget.categoryId, categoryName: budget.category.name, monthId: month.id, limit: budget.limit.toNumber(), alertPercent: budget.alertPercent, planningGroup: budget.planningGroup, spent: spentByCategory.get(budget.categoryId) ?? 0 }));
  const profile = { dailyGrossTarget: Number(driverProfile.dailyGrossTarget), workDays: Number(driverProfile.workDays), fuelPercent: Number(driverProfile.fuelPercent), maintenancePercent: Number(driverProfile.maintenancePercent), taxPercent: Number(driverProfile.taxPercent), emergencyPercent: Number(driverProfile.emergencyPercent) };
  const plannedNetMonthly = profile.dailyGrossTarget * profile.workDays * Math.max(0, 1 - (profile.fuelPercent + profile.maintenancePercent + profile.taxPercent + profile.emergencyPercent) / 100);
  const debtRows = debts.map(serializePersonalDebt);

  const baseParams = new URLSearchParams();
  if (firstParam(params.month)) baseParams.set("month", firstParam(params.month) as string);
  if (firstParam(params.q)) baseParams.set("q", firstParam(params.q) as string);
  if (firstParam(params.status)) baseParams.set("status", firstParam(params.status) as string);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Movimento mensal" title="Despesas" description="Contas para pagar, dívidas pessoais e limites de planejamento no mesmo lugar." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-2 overflow-x-auto" aria-label="Seções de despesas">
          {views.map((view) => <Link key={view.value} href={`/app/despesas?view=${view.value}`} className={`inline-flex h-10 shrink-0 items-center rounded-lg border px-4 text-sm font-medium ${selectedView === view.value ? "border-primary/40 bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-secondary"}`}>{view.label}</Link>)}
        </nav>
        {selectedView === "entries" ? <div className="flex items-center gap-2"><Link href="/app/despesas?type=FINANCING" className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary"><Landmark className="size-4" />Financiamentos</Link><ExpenseCreateAction accounts={accountOptions} categories={categoryOptions} compact /></div> : null}
      </div>

      {selectedView === "entries" ? <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total do mês" value={currency(monthlyTotal)} helper={`${monthlyData.total} lançamento(s)`} icon={Receipt} tone="rose" />
          <SummaryCard title="Pago" value={currency(monthlyPaid)} helper="Já saiu da conta" icon={CheckCircle2} tone="emerald" />
          <SummaryCard title="Pendente" value={currency(monthlyPending)} helper="Dentro do prazo" icon={Clock} tone="amber" />
          <SummaryCard title="Vencido" value={currency(monthlyOverdue)} helper="Precisa de ação" icon={AlertTriangle} tone="rose" />
        </section>
        <div className="flex gap-2 overflow-x-auto">
          {typeTabs.map((tab) => <Link key={tab.value} className={`inline-flex h-9 shrink-0 items-center rounded-lg border px-3 text-xs font-medium ${selectedType === tab.value ? "border-primary/40 bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-secondary"}`} href={`/app/despesas?${new URLSearchParams([...baseParams.entries(), ...(tab.value ? [["type", tab.value]] : [])]).toString()}`}>{tab.label}</Link>)}
        </div>
        <FilterBar
          placeholder="Pesquisar despesas"
          quickFilters={[
            { label: "Este mês", params: { month: todayInput().slice(0, 7) }, clear: ["q", "status", "type"] },
            { label: "Pendentes", params: { status: "PENDING" }, clear: ["q", "type"] },
            { label: "Atrasadas", params: { status: "OVERDUE" }, clear: ["q", "type"] },
            { label: "Financiamentos", params: { type: "FINANCING" }, clear: ["q", "status"] },
            { label: "Cartão", href: `/app/cartoes?month=${encodeURIComponent(firstParam(params.month) ?? todayInput().slice(0, 7))}` },
            { label: "Limpar filtros", clear: ["q", "status", "type"] },
          ]}
        />
        <DataTable columns={["Descrição", "Categoria", "Tipo", "Vencimento", "Valor", "Status", "Corrigir"]} rows={data.items.map((expense) => [
          expense.title,
          expense.category.name,
          typeLabels[expense.type] ?? expense.type,
          shortDate(expense.dueDate ?? expense.date),
          currency(Number(expense.amount)),
          statusLabel(resolveTransactionStatus(expense.status, expense.dueDate ?? expense.date)),
          <ExpenseRowActions key={expense.id} accounts={accountOptions} categories={categoryOptions} expense={{ id: expense.id, accountId: expense.accountId, amount: Number(expense.amount), categoryId: expense.categoryId, date: expense.date.toISOString().slice(0, 10), description: expense.description ?? "", dueDate: (expense.dueDate ?? expense.date).toISOString().slice(0, 10), installments: expense.installments ?? 1, status: resolveTransactionStatus(expense.status, expense.dueDate ?? expense.date), title: expense.title, type: expense.type }} />,
        ])} />
      </> : null}

      {selectedView === "debts" ? <DebtBoard initialRows={debtRows} compact /> : null}
      {selectedView === "planning" ? <BudgetBoard rows={budgetRows} categories={categoryOptions} monthId={month.id} plannedNetMonthly={plannedNetMonthly} compact /> : null}
    </div>
  );
}
