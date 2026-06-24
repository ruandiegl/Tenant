export type PeriodFilterValue = "today" | "yesterday" | "last7" | "custom";

export type PeriodRange = {
  from: string;
  to: string;
};

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function fromDateInputValue(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function dayBounds(date: Date): PeriodRange {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);

  const to = new Date(date);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

export function rangeBounds(fromDate: Date, toDate: Date): PeriodRange {
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);

  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

export function getPeriodRange(period: PeriodFilterValue, customStartDate: string, customEndDate: string): PeriodRange {
  const today = new Date();

  if (period === "today") return dayBounds(today);

  if (period === "yesterday") return dayBounds(addDays(today, -1));

  if (period === "last7") return rangeBounds(addDays(today, -6), today);

  const from = fromDateInputValue(customStartDate);
  const to = fromDateInputValue(customEndDate);

  return rangeBounds(from <= to ? from : to, from <= to ? to : from);
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date).replace(".", "");
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}
