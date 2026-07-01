import type { RecurrenceFrequency } from "@prisma/client";

export function addFrequency(date: Date, frequency: RecurrenceFrequency) {
  const next = new Date(date);

  if (frequency === "WEEKLY") next.setDate(next.getDate() + 7);
  if (frequency === "BIWEEKLY") next.setDate(next.getDate() + 15);
  if (frequency === "MONTHLY") next.setMonth(next.getMonth() + 1);
  if (frequency === "YEARLY") next.setFullYear(next.getFullYear() + 1);
  if (frequency === "DAILY") next.setDate(next.getDate() + 1);

  return next;
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}
