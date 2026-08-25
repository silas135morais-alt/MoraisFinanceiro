export function monthParamToDate(month?: string | null) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return new Date();

  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1, 12, 0, 0));
}

export function dateToMonthParam(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
