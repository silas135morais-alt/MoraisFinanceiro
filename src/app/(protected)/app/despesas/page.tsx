import { AlertTriangle, CheckCircle2, Clock, Receipt } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { SummaryCard } from "@/components/shared/summary-card";
import { requireUserId } from "@/lib/auth-guard";
import { getMonthRange } from "@/lib/date-range";
import { currency, shortDate } from "@/lib/format";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { resolveTransactionStatus, statusLabel } from "@/lib/transaction-status";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { expenseService } from "@/services/expense-service";

import { ExpenseCreateAction, ExpenseRowActions } from "./expense-actions";

const tabs = [
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
  const selectedType = firstParam(params.type) ?? "";
  const { startsAt, endsAt } = getMonthRange(monthParamToDate(firstParam(params.month)));
  const [data, monthlyData, categories, accounts] = await Promise.all([
    expenseService.list(userId, {
      pageSize: 20,
      q: firstParam(params.q),
      status: firstParam(params.status),
      type: selectedType || undefined,
      startDate: startsAt.toISOString(),
      endDate: endsAt.toISOString(),
    }),
    expenseService.list(userId, {
      pageSize: 200,
      startDate: startsAt.toISOString(),
      endDate: endsAt.toISOString(),
    }),
    categoryService.list(userId, "EXPENSE"),
    accountService.list(userId),
  ]);
  const monthlyTotal = monthlyData.items.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthlyPaid = monthlyData.items
    .filter((expense) => expense.status === "PAID")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthlyPending = monthlyData.items
    .filter((expense) => resolveTransactionStatus(expense.status, expense.dueDate ?? expense.date) === "PENDING")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthlyOverdue = monthlyData.items
    .filter((expense) => resolveTransactionStatus(expense.status, expense.dueDate ?? expense.date) === "OVERDUE")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
  const baseTabParams = new URLSearchParams();
  if (firstParam(params.month)) baseTabParams.set("month", firstParam(params.month) as string);
  if (firstParam(params.q)) baseTabParams.set("q", firstParam(params.q) as string);
  if (firstParam(params.status)) baseTabParams.set("status", firstParam(params.status) as string);
  const accountOptions = accounts.map((account) => ({ id: account.id, name: account.name }));
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));
  const rows = data.items.map((expense) => [
    expense.title,
    expense.category.name,
    typeLabels[expense.type] ?? expense.type,
    shortDate(expense.dueDate ?? expense.date),
    currency(Number(expense.amount)),
    statusLabel(resolveTransactionStatus(expense.status, expense.dueDate ?? expense.date)),
    <ExpenseRowActions
      key={expense.id}
      accounts={accountOptions}
      categories={categoryOptions}
      expense={{
        id: expense.id,
        accountId: expense.accountId,
        amount: Number(expense.amount),
        categoryId: expense.categoryId,
        date: expense.date.toISOString().slice(0, 10),
        description: expense.description ?? "",
        dueDate: (expense.dueDate ?? expense.date).toISOString().slice(0, 10),
        installments: expense.installments ?? 1,
        status: resolveTransactionStatus(expense.status, expense.dueDate ?? expense.date),
        title: expense.title,
        type: expense.type,
      }}
    />,
  ]);

  return (
    <div className="space-y-6">
      <ExpenseCreateAction accounts={accountOptions} categories={categoryOptions} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total do mes" value={currency(monthlyTotal)} helper={`${monthlyData.total} despesa(s) vencem neste mes`} icon={Receipt} tone="rose" />
        <SummaryCard title="Pago no mes" value={currency(monthlyPaid)} helper="Somente despesas pagas" icon={CheckCircle2} tone="emerald" />
        <SummaryCard title="Pendente" value={currency(monthlyPending)} helper="Ainda dentro do prazo" icon={Clock} tone="amber" />
        <SummaryCard title="Vencido" value={currency(monthlyOverdue)} helper="Precisa de atencao" icon={AlertTriangle} tone="rose" />
      </section>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            className={`inline-flex h-10 shrink-0 items-center rounded-lg border px-4 text-sm font-medium transition-colors ${
              selectedType === tab.value ? "border-primary/40 bg-primary/10 text-primary" : "bg-card text-muted-foreground"
            }`}
            href={`/app/despesas?${tab.value ? new URLSearchParams([...baseTabParams.entries(), ["type", tab.value]]).toString() : baseTabParams.toString()}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <FilterBar placeholder="Pesquisar despesas" />
      <DataTable columns={["Descricao", "Categoria", "Tipo", "Data", "Valor", "Status", "Acoes"]} rows={rows} />
    </div>
  );
}
