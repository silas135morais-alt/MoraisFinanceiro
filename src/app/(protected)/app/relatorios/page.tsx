import { Download, FileText, PieChart } from "lucide-react";

import { DashboardChart } from "@/components/shared/dashboard-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-guard";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { getDashboard } from "@/services/dashboard-service";

type RelatoriosPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RelatoriosPage({ searchParams }: RelatoriosPageProps) {
  const params = (await searchParams) ?? {};
  const dashboard = await getDashboard(await requireUserId(), monthParamToDate(firstParam(params.month)));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatórios"
        title="Análises e comparativos"
        description="Gráficos, comparações e exportação com base nos dados reais."
        actions={<Button asChild variant="outline"><a href="/api/export?entity=reports&format=pdf"><Download className="size-4" />Exportar</a></Button>}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardChart title="Comparativo mensal" subtitle="Saldo, entradas e saídas" data={dashboard.charts.cashFlow} />
        <DashboardChart title="Categorias" subtitle="Distribuição por grupo" data={dashboard.charts.incomeExpense} />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <EmptyState icon={PieChart} title="Comparativos avançados" description="Análises entre meses, categorias e contas seguem preparadas para evolução." />
        <EmptyState icon={FileText} title="Central de exportação" description="Relatórios disponíveis em PDF, CSV e planilhas." />
      </section>
    </div>
  );
}
