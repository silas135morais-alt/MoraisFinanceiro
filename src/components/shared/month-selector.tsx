"use client";

import { CalendarDays } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { dateToMonthParam } from "@/lib/month-param";
import { cn } from "@/lib/utils";

function buildMonths() {
  const now = new Date();
  const months = [];

  for (let offset = -12; offset <= 12; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    months.push({
      label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date),
      value: dateToMonthParam(date),
    });
  }

  return months;
}

export function MonthSelector({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const months = useMemo(buildMonths, []);
  const selectedMonth = searchParams.get("month") ?? dateToMonthParam();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border bg-card px-3 text-sm shadow-sm",
        compact ? "h-10" : "h-11",
      )}
    >
      <CalendarDays className="size-4 text-muted-foreground" />
      <select
        aria-label="Selecionar mes"
        className="bg-transparent font-medium outline-none"
        onChange={(event) => handleChange(event.target.value)}
        value={selectedMonth}
      >
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </label>
  );
}
