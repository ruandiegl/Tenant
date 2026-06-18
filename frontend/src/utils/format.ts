export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatTime(value?: string) {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function minutesUntil(value: string) {
  const diff = new Date(value).getTime() - new Date("2026-06-18T12:20:00-03:00").getTime();
  return Math.max(0, Math.round(diff / 60000));
}
