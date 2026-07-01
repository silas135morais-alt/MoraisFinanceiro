import { Repeat } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { requireUserId } from "@/lib/auth-guard";
import { currency, shortDate } from "@/lib/format";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { subscriptionService } from "@/services/subscription-service";

import { SubscriptionActions } from "./subscription-actions";

export default async function AssinaturasPage() {
  const userId = await requireUserId();
  const [items, accounts, categories] = await Promise.all([
    subscriptionService.list(userId),
    accountService.list(userId),
    categoryService.list(userId, "EXPENSE"),
  ]);
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Assinaturas" title="Cobrancas recorrentes" description="Netflix, Spotify, Amazon e demais assinaturas com proxima cobranca e status." />
      <SubscriptionActions
        accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
      <SummaryCard title="Total recorrente" value={currency(total)} helper={`${items.length} assinaturas ativas`} icon={Repeat} tone="violet" />
      <DataTable columns={["Nome", "Proxima cobranca", "Valor", "Recorrencia", "Status"]} rows={items.map((item) => [item.name, shortDate(item.nextChargeAt), currency(Number(item.amount)), item.frequency, item.status])} />
    </div>
  );
}
