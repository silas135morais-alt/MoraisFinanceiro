import { Landmark } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressRow } from "@/components/shared/progress-row";
import { SummaryCard } from "@/components/shared/summary-card";
import { requireUserId } from "@/lib/auth-guard";
import { currency, shortDate } from "@/lib/format";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { financingService } from "@/services/financing-service";

import { FinancingActions } from "./financing-actions";

export default async function FinanciamentosPage() {
  const userId = await requireUserId();
  const [items, accounts, categories] = await Promise.all([
    financingService.list(userId),
    accountService.list(userId),
    categoryService.list(userId, "EXPENSE"),
  ]);
  const balance = items.reduce((sum, item) => sum + Number(item.outstandingBalance), 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Financiamentos" title="Evolucao dos contratos" description="Valor financiado, juros, parcelas, parcela atual e saldo devedor." />
      <FinancingActions
        accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
      <SummaryCard title="Saldo devedor" value={currency(balance)} helper={`${items.length} contratos ativos`} icon={Landmark} tone="amber" />
      <section className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <ProgressRow
            key={item.id}
            title={item.name}
            current={`${item.currentInstallment}/${item.installments}`}
            target={currency(Number(item.outstandingBalance))}
            progress={Math.round((item.currentInstallment / item.installments) * 100)}
          />
        ))}
      </section>
      <DataTable columns={["Nome", "Parcela", "Saldo", "Proximo vencimento"]} rows={items.map((item) => [item.name, `${item.currentInstallment}/${item.installments}`, currency(Number(item.outstandingBalance)), shortDate(item.nextDueDate)])} />
    </div>
  );
}
