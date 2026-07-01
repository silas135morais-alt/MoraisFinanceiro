import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  blue: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

type SummaryCardProps = {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: string;
};

export function SummaryCard({ title, value, helper, icon: Icon, tone = "slate" }: SummaryCardProps) {
  return (
    <article className="animate-in-soft rounded-lg border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{helper}</p>
    </article>
  );
}
