import { Download, Upload } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

const entities = ["incomes", "expenses", "cards", "reports"];
const formats = ["csv", "xlsx", "pdf"];

export default function ExportacaoPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Importação e exportação" title="Arquivos financeiros" description="Exportar CSV, Excel e PDF. Importar CSV ou Excel com mapeamento automático de colunas." />
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><Download className="size-4 text-primary" />Exportar</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {entities.map((entity) => (
            <div key={entity} className="rounded-lg border p-3">
              <p className="mb-3 text-sm font-medium">{entity}</p>
              <div className="flex flex-wrap gap-2">
                {formats.map((format) => (
                  <Button key={format} asChild size="sm" variant="outline">
                    <a href={`/api/export?entity=${entity}&format=${format}`}>{format.toUpperCase()}</a>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-2 flex items-center gap-2 font-semibold"><Upload className="size-4 text-primary" />Importar</h3>
        <p className="text-sm text-muted-foreground">
          API disponível em <code>/api/import</code> recebendo entidade e conteúdo CSV ou Excel em base64.
        </p>
      </section>
    </div>
  );
}
