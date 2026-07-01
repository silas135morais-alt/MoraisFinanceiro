import { CheckCircle2 } from "lucide-react";
import type { TransactionStatus } from "@prisma/client";

import { markTransactionPaidAction } from "@/actions/operational-actions";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-guard";
import { currency, shortDate } from "@/lib/format";
import { resolveTransactionStatus, statusLabel } from "@/lib/transaction-status";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { payablesService } from "@/services/payables-service";

import { IncomeCreateAction } from "../receitas/income-create-action";

export default async function ContasAReceberPage() {
  const userId = await requireUserId();
  const [data, accounts, categories] = await Promise.all([
    payablesService.listReceivables(userId),
    accountService.list(userId),
    categoryService.list(userId, "INCOME"),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contas a receber"
        title="Recebimentos futuros"
        description="Esta tela mostra automaticamente receitas pendentes, previstas e atrasadas. Use o botao abaixo para cadastrar uma receita futura."
      />
      <IncomeCreateAction
        accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        compact
      />
      <QuickSection title="Recebendo hoje" items={data.today} />
      <QuickSection title="Esta semana" items={data.week} />
      <QuickSection title="Este mes" items={data.month} />
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Marcar recebimento</h3>
        <div className="grid gap-2">
          {[...data.today, ...data.week, ...data.month].slice(0, 5).map((item) => (
            <form key={item.id} action={markTransactionPaidAction.bind(null, item.id)} className="flex items-center justify-between rounded-lg bg-secondary/55 p-3">
              <span className="text-sm">{item.title}</span>
              <Button size="sm" type="submit">
                <CheckCircle2 className="size-4" />
                Marcar como recebido
              </Button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickSection({ title, items }: { title: string; items: { id: string; title: string; amount: unknown; date: Date; status: TransactionStatus }[] }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <DataTable columns={["Descricao", "Data", "Valor", "Status"]} rows={items.map((item) => [item.title, shortDate(item.date), currency(Number(item.amount)), statusLabel(resolveTransactionStatus(item.status, item.date))])} />
    </section>
  );
}
