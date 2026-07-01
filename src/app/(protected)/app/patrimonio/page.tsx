import { Building2, Car, Landmark } from "lucide-react";

import { DashboardChart } from "@/components/shared/dashboard-chart";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { requireUserId } from "@/lib/auth-guard";
import { currency } from "@/lib/format";
import { assetService } from "@/services/asset-service";

export default async function PatrimonioPage() {
  const assets = await assetService.list(await requireUserId());
  const total = assets.reduce((sum, asset) => sum + Number(asset.value), 0);
  const realEstate = assets.filter((asset) => asset.type === "REAL_ESTATE").reduce((sum, asset) => sum + Number(asset.value), 0);
  const vehicles = assets.filter((asset) => asset.type === "VEHICLE").reduce((sum, asset) => sum + Number(asset.value), 0);
  const chart = assets.length ? assets.map((asset) => Math.max(10, Math.min(Number(asset.value) / Math.max(total, 1) * 100, 100))) : [20, 28, 35, 42, 55, 68, 74, 82];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Patrimônio"
        title="Visão consolidada de ativos e bens"
        description="Composição patrimonial e evolução baseada nos ativos cadastrados."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Patrimônio bruto" value={currency(total)} helper="Ativos e bens" icon={Landmark} tone="emerald" />
        <SummaryCard title="Imóveis" value={currency(realEstate)} helper="Bens imobiliários" icon={Building2} tone="blue" />
        <SummaryCard title="Veículos" value={currency(vehicles)} helper="Valor estimado" icon={Car} tone="amber" />
      </section>
      <DashboardChart title="Evolução patrimonial" subtitle="Distribuição atual por ativo" data={chart} variant="line" />
      <DataTable columns={["Item", "Tipo", "Valor"]} rows={assets.map((asset) => [asset.name, asset.type, currency(Number(asset.value))])} />
    </div>
  );
}
