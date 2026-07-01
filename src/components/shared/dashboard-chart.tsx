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
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-normal">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
          Mock
        </span>
      </div>

      <div className="flex h-44 items-end gap-2">
        {data.map((value, index) => (
          <div key={`${title}-${index}`} className="flex flex-1 items-end">
            <div
              className={cn(
                "w-full rounded-t-md transition-all duration-500",
                variant === "line"
                  ? "bg-primary/25 shadow-[0_-8px_30px_hsl(var(--primary)/0.12)]"
                  : "bg-primary/80",
              )}
              style={{ height: `${value}%` }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
