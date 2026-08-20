import type { RecurrenceFrequency } from "@prisma/client";

import { addMonths } from "@/lib/date-range";

export function addFrequency(date: Date, frequency: RecurrenceFrequency) {
  if (frequency === "MONTHLY") return addMonths(date, 1);
  if (frequency === "YEARLY") return addMonths(date, 12);

  const next = new Date(date);
  if (frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === "BIWEEKLY") next.setUTCDate(next.getUTCDate() + 15);
  if (frequency === "DAILY") next.setUTCDate(next.getUTCDate() + 1);

  return next;
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
