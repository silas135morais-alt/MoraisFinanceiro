export function getMonthRange(date = new Date()) {
  const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const endsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { startsAt, endsAt };
}

export function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}
