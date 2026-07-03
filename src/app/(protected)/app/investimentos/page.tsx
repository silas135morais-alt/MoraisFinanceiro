import { Banknote, LineChart, Plus } from "lucide-react";

import { DashboardChart } from "@/components/shared/dashboard-chart";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { requireUserId } from "@/lib/auth-guard";
import { currency, shortDate } from "@/lib/format";
import { investmentService } from "@/services/investment-service";

import { ContributionRowActions } from "./contribution-row-actions";
import { InvestmentActions } from "./investment-actions";
import { InvestmentRowActions } from "./investment-row-actions";

export default async function InvestimentosPage() {
  const investments = await investmentService.list(await requireUserId());
  const total = investments.reduce((sum, item) => sum + Number(item.currentValue), 0);
  const contributions = investments.flatMap((item) =>
    item.contributions.map((contribution) => ({ ...contribution, investmentName: item.name })),
  );
  const contributionTotal = contributions.reduce((sum, item) => sum + Number(item.amount), 0);
  const chart = investments.length ? investments.map((item) => Math.max(8, Math.min((Number(item.currentValue) / Math.max(total, 1)) * 100, 100))) : [12, 18, 24, 32, 46, 58, 72, 86];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investimentos"
        title="Carteira, aportes e metas"
        description="Cadastre investimentos e registre aportes para acompanhar a evolucao da carteira."
      />
      <InvestmentActions investments={investments.map((investment) => ({ id: investment.id, name: investment.name }))} />
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Total investido" value={currency(total)} helper="Carteira consolidada" icon={LineChart} tone="emerald" />
        <SummaryCard title="Meta mensal" value={currency(0)} helper="Configure metas na fase final" icon={Banknote} tone="blue" />
        <SummaryCard title="Aportes" value={currency(contributionTotal)} helper={`${contributions.length} aporte(s)`} icon={Plus} tone="violet" />
      </section>
      <DashboardChart title="Historico da carteira" subtitle="Composicao atual por ativo" data={chart} variant="line" />
      <DataTable
        columns={["Ativo", "Tipo", "Valor", "Atualizado", "Acoes"]}
        rows={investments.map((item) => [
          item.name,
          item.type,
          currency(Number(item.currentValue)),
          shortDate(item.updatedAt),
          <InvestmentRowActions
            key={item.id}
            investment={{
              id: item.id,
              currentValue: Number(item.currentValue),
              institution: item.institution ?? "",
              name: item.name,
              targetValue: item.targetValue ? Number(item.targetValue) : null,
              type: item.type,
            }}
          />,
        ])}
      />
      <DataTable
        columns={["Investimento", "Data", "Valor", "Descricao", "Acoes"]}
        rows={contributions.map((item) => [
          item.investmentName,
          shortDate(item.date),
          currency(Number(item.amount)),
          item.description ?? "-",
          <ContributionRowActions key={item.id} id={item.id} />,
        ])}
      />
    </div>
  );
}
