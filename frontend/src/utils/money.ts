export function formatMoneyInput(value: number | undefined) {
  if (value === undefined) return "";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function parseMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}
