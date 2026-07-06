import "./styles.css";
import { OrderStatus, PaymentStatus, ProductStatus } from "../../../types/database";

const labels: Record<string, string> = {
  ACTIVE: "Ativo",
  TRIAL: "Trial",
  SUSPENDED: "Suspenso",
  INACTIVE: "Inativo",
  CLOSED_TEMPORARILY: "Fechado",
  OUT_OF_STOCK: "Esgotado",
  ARCHIVED: "Arquivado",
  PLACED: "Novo",
  ACCEPTED: "Aceito",
  PREPARING: "Preparo",
  READY: "Pronto",
  DISPATCHED: "Saiu",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado",
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Falhou",
  QUEUED: "Na fila",
  STARTED: "Em preparo",
  DELAYED: "Atrasado"
};

export function StatusBadge({ status }: { status: OrderStatus | PaymentStatus | ProductStatus | string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{labels[status] ?? status}</span>;
}

