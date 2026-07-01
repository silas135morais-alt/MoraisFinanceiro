import { ArrowUpRight, CalendarCheck, Wallet } from "lucide-react";

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
import { incomeService } from "@/services/income-service";

import { IncomeCreateAction } from "./income-create-action";
import { IncomeRowActions } from "./income-row-actions";

type ReceitasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReceitasPage({ searchParams }: ReceitasPageProps) {
  const userId = await requireUserId();
  const params = (await searchParams) ?? {};
  const { startsAt, endsAt } = getMonthRange(monthParamToDate(firstParam(params.month)));
  const [data, categories, accounts] = await Promise.all([
    incomeService.list(userId, {
      pageSize: 20,
      q: firstParam(params.q),
      status: firstParam(params.status),
      startDate: startsAt.toISOString(),
      endDate: endsAt.toISOString(),
    }),
    categoryService.list(userId, "INCOME"),
    accountService.list(userId),
  ]);
  const paidTotal = data.items
    .filter((income) => income.status === "PAID")
    .reduce((sum, income) => sum + Number(income.amount), 0);
  const receivableTotal = data.items
    .filter((income) => income.status === "PENDING" || income.status === "OVERDUE")
    .reduce((sum, income) => sum + Number(income.amount), 0);
  const monthlyTotal = paidTotal + receivableTotal;
  const accountOptions = accounts.map((account) => ({ id: account.id, name: account.name }));
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));
  const rows = data.items.map((income) => [
    income.title,
    income.category.name,
    shortDate(income.date),
    currency(Number(income.amount)),
    statusLabel(resolveTransactionStatus(income.status, income.date)),
    <IncomeRowActions
      key={income.id}
      accounts={accountOptions}
      categories={categoryOptions}
      income={{
        id: income.id,
        accountId: income.accountId,
        amount: Number(income.amount),
        categoryId: income.categoryId,
        date: income.date.toISOString().slice(0, 10),
        description: income.description ?? "",
        isRecurring: income.isRecurring,
        status: resolveTransactionStatus(income.status, income.date),
        title: income.title,
      }}
    />,
  ]);

  return (
    <div className="space-y-6">
      <IncomeCreateAction
        accounts={accountOptions}
        categories={categoryOptions}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Recebido" value={currency(paidTotal)} helper={`${data.total} receitas cadastradas`} icon={Wallet} tone="emerald" />
        <SummaryCard title="A receber" value={currency(receivableTotal)} helper="Pendentes e vencidas" icon={CalendarCheck} tone="blue" />
        <SummaryCard title="Total do mes" value={currency(monthlyTotal)} helper="Recebidas + a receber" icon={ArrowUpRight} tone="violet" />
      </section>
      <FilterBar placeholder="Pesquisar receitas" />
      <DataTable columns={["Descricao", "Categoria", "Data", "Valor", "Status", "Acoes"]} rows={rows} />
    </div>
  );
}
