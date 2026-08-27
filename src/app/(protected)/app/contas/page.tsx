import { Landmark, PiggyBank, Wallet } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { requireUserId } from "@/lib/auth-guard";
import { monthParamToDate } from "@/lib/month-param";
import { currency } from "@/lib/format";
import { accountService } from "@/services/account-service";

import { AccountCreateAction, AccountRowActions } from "./account-actions";

const typeLabels: Record<string, string> = {
  CASH: "Dinheiro",
  CHECKING: "Conta corrente",
  OTHER: "Outra",
  SAVINGS: "Poupanca",
  WALLET: "Carteira",
};

export default async function ContasPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const userId = await requireUserId();
  const params = await searchParams;
  const selectedDate = monthParamToDate(params.month);
  const accounts = await accountService.listWithBalances(userId, selectedDate);
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  const openingTotal = accounts.reduce((sum, account) => sum + account.monthlyOpeningBalance, 0);
  const mainAccount = accounts.find((account) => account.isDefault) ?? accounts[0];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<AccountCreateAction />}
        description="Organize o dinheiro que esta em cada banco, carteira ou em especie."
        eyebrow="Contas"
        title="Dinheiro separado por lugar"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Total em contas" value={currency(total)} helper={`${accounts.length} conta(s) ativa(s)`} icon={Wallet} tone="emerald" />
        <SummaryCard title="Conta principal" value={mainAccount ? currency(mainAccount.balance) : currency(0)} helper={mainAccount?.name ?? "Nenhuma conta"} icon={Landmark} tone="blue" />
        <SummaryCard
          title="Saldo inicial do mês"
          value={currency(openingTotal)}
          helper={selectedDate ? "Saldo base + ajuste do mês" : "Base antes das movimentacoes"}
          icon={PiggyBank}
          tone="violet"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {accounts.map((account) => (
          <article key={account.id} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
                  <h3 className="truncate font-semibold">{account.name}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{account.institution ?? typeLabels[account.type] ?? "Conta financeira"}</p>
              </div>
              {account.isDefault ? <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Principal</span> : null}
            </div>
            <p className="mt-6 text-2xl font-semibold">{currency(account.balance)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Saldo disponivel nesta conta</p>
          </article>
        ))}
      </section>

      <DataTable
        columns={["Conta", "Tipo", "Saldo inicial do mês", "Saldo atual", "Acoes"]}
        rows={accounts.map((account) => [
          <div key={account.id} className="flex items-center gap-2">
            <span className="size-3 rounded-full" style={{ backgroundColor: account.color }} />
            <span className="font-medium">{account.name}</span>
          </div>,
          typeLabels[account.type] ?? account.type,
          currency(account.monthlyOpeningBalance),
          currency(account.balance),
          <AccountRowActions
            key={account.id}
            account={{
              id: account.id,
              color: account.color,
              initialBalance: Number(account.initialBalance),
              institution: account.institution,
              isDefault: account.isDefault,
              name: account.name,
              type: account.type,
            }}
          />,
        ])}
      />
    </div>
  );
}
