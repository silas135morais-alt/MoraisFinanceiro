import { cn } from "@/lib/utils";

type DashboardChartProps = {
  title: string;
  subtitle: string;
  data: number[];
  variant?: "bars" | "line";
};

export function DashboardChart({
  title,
  subtitle,
  data,
  variant = "bars",
}: DashboardChartProps) {
  const max = Math.max(...data.map((value) => Math.abs(value)), 0);

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-normal">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
          Dados reais
        </span>
      </div>

      {max === 0 ? (
        <p className="rounded-lg bg-secondary/55 px-3 py-10 text-center text-sm text-muted-foreground">
          Sem dados suficientes para exibir este gráfico no período selecionado.
        </p>
      ) : (
        <div
          className="flex h-44 items-end gap-2"
          role="img"
          aria-label={`${title}: ${data.map((value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })).join(", ")}`}
        >
          {data.map((value, index) => {
            const height = Math.max(8, Math.min((Math.abs(value) / max) * 100, 100));
            return (
              <div key={`${title}-${index}`} className="flex h-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-500",
                    variant === "line"
                      ? "bg-primary/25 shadow-[0_-8px_30px_hsl(var(--primary)/0.12)]"
                      : "bg-primary/80",
                  )}
                  style={{ height: `${height}%` }}
                  title={value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
