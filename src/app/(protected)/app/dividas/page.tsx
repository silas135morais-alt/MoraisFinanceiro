import { AlertCircle, WalletCards } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { requireUserId } from "@/lib/auth-guard";
import { currency } from "@/lib/format";
import { personalDebtService, serializePersonalDebt } from "@/services/personal-debt-service";

import { DebtBoard } from "./debt-board";

export default async function DividasPage() {
  const items = await personalDebtService.list(await requireUserId());
  type DebtRow = ReturnType<typeof serializePersonalDebt>;
  const rows: DebtRow[] = items.map(serializePersonalDebt);
  const total = rows.reduce((sum: number, item: DebtRow) => sum + item.outstandingBalance, 0);
  const urgent = rows.filter((item) => item.priority === "URGENT").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Passivo pessoal"
        title="Dívidas pessoais"
        description="Cadastre credores e valores que precisam ser quitados. Esta área é diferente de financiamentos e contratos parcelados."
      />
      <section className="grid gap-4 sm:grid-cols-2">
        <SummaryCard title="Saldo devedor" value={currency(total)} helper={`${rows.length} dívida(s) em aberto`} icon={WalletCards} tone="amber" />
        <SummaryCard title="Prioridades urgentes" value={String(urgent)} helper="Ordenadas primeiro no Diagnóstico" icon={AlertCircle} tone="rose" />
      </section>
      <DebtBoard initialRows={rows} />
    </div>
  );
}
