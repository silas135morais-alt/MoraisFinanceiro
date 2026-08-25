import { CheckCircle2, Download, ShieldCheck, Upload } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { dateToMonthParam, firstParam } from "@/lib/month-param";
import { Button } from "@/components/ui/button";

const exports = [
  { entity: "incomes", label: "Receitas", description: "Salários, ganhos da 99 e outros recebimentos." },
  { entity: "expenses", label: "Despesas", description: "Contas, despesas futuras, financiamentos e compromissos." },
  { entity: "cards", label: "Cartões", description: "Compras e faturas do período." },
  { entity: "reports", label: "Relatório mensal", description: "Resumo consolidado para consulta ou arquivo." },
];

const formats = [
  { value: "csv", label: "CSV", description: "Para abrir em planilhas e fazer análises." },
  { value: "xlsx", label: "Excel", description: "Para compartilhar ou continuar editando." },
  { value: "pdf", label: "PDF", description: "Para guardar uma cópia visual." },
];

type ExportacaoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExportacaoPage({ searchParams }: ExportacaoPageProps) {
  const params = (await searchParams) ?? {};
  const month = firstParam(params.month) ?? dateToMonthParam(new Date());
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Importação e exportação" title="Arquivos financeiros" description="Exporte seus dados com poucos cliques e mantenha uma cópia de segurança antes de mudanças importantes." />

      <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><h3 className="flex items-center gap-2 font-semibold"><Download className="size-4 text-primary" />Exportar dados</h3><p className="mt-1 text-sm text-muted-foreground">Escolha o conjunto de dados e depois o formato desejado. O download começa em uma nova aba.</p></div>
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><ShieldCheck className="size-3.5" />Somente leitura</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {exports.map((item) => (
            <div key={item.entity} className="rounded-lg border p-4">
              <p className="font-medium">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {formats.map((format) => <Button key={format.value} asChild size="sm" variant="outline"><a href={`/api/export?entity=${item.entity}&format=${format.value}&month=${encodeURIComponent(month)}`} target="_blank" rel="noreferrer" title={format.description}>{format.label}</a></Button>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4 text-primary" />Checklist de backup</h3>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li><strong className="text-foreground">1.</strong> Exporte Receitas, Despesas e Cartões em CSV ou Excel.</li>
            <li><strong className="text-foreground">2.</strong> Guarde os arquivos fora do computador principal, de preferência em uma pasta protegida.</li>
            <li><strong className="text-foreground">3.</strong> Gere também um PDF mensal para consulta rápida.</li>
            <li><strong className="text-foreground">4.</strong> Faça um novo backup antes de importar dados ou pedir exclusões.</li>
          </ol>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="flex items-center gap-2 font-semibold"><Upload className="size-4 text-primary" />Importar dados</h3>
          <p className="mt-3 text-sm text-muted-foreground">A API de importação aceita CSV ou Excel com mapeamento de colunas. Antes de importar, faça um backup e revise a planilha para evitar duplicidades.</p>
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Nenhuma importação ou restauração é executada automaticamente nesta tela.</p>
          <p className="mt-3 text-xs text-muted-foreground">Endpoint disponível: <code>/api/import</code></p>
        </div>
      </section>
    </div>
  );
}
