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

import { ExpenseCreateAction } from "../despesas/expense-actions";

export default async function ContasAPagarPage() {
  const userId = await requireUserId();
  const [data, categories, accounts] = await Promise.all([
    payablesService.listPayables(userId),
    categoryService.list(userId, "EXPENSE"),
    accountService.list(userId),
  ]);
  const accountOptions = accounts.map((account) => ({ id: account.id, name: account.name }));
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contas a pagar"
        title="Vencimentos e pendencias"
        description="Esta tela mostra automaticamente despesas pendentes, vencendo e atrasadas. Use o botao abaixo para cadastrar uma conta futura."
      />
      <ExpenseCreateAction accounts={accountOptions} categories={categoryOptions} compact />
      <QuickSection title="Vencendo hoje" items={data.today} />
      <QuickSection title="Esta semana" items={data.week} />
      <QuickSection title="Este mes" items={data.month} />
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Acoes rapidas</h3>
        <div className="grid gap-2">
          {[...data.today, ...data.week, ...data.month].slice(0, 5).map((item) => (
            <form key={item.id} action={markTransactionPaidAction.bind(null, item.id)} className="flex items-center justify-between rounded-lg bg-secondary/55 p-3">
              <span className="text-sm">{item.title}</span>
              <Button size="sm" type="submit">
                <CheckCircle2 className="size-4" />
                Marcar como pago
              </Button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickSection({ title, items }: { title: string; items: { id: string; title: string; amount: unknown; dueDate: Date | null; status?: TransactionStatus }[] }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <DataTable
        columns={["Descricao", "Vencimento", "Valor", "Status"]}
        rows={items.map((item) => [
          item.title,
          shortDate(item.dueDate),
          currency(Number(item.amount)),
          item.status ? statusLabel(resolveTransactionStatus(item.status, item.dueDate)) : "-",
        ])}
      />
    </section>
  );
}
