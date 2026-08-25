import type { TransactionStatus } from "@prisma/client";

function startOfUtcToday() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

export function resolveTransactionStatus(status: TransactionStatus, dueDate?: Date | string | null) {
  if (status === "PAID" || status === "CANCELED" || !dueDate) return status;

  return new Date(dueDate) < startOfUtcToday() ? "OVERDUE" : "PENDING";
}

export function statusLabel(status: TransactionStatus) {
  const labels: Record<TransactionStatus, string> = {
    CANCELED: "Cancelado",
    OVERDUE: "Atrasado",
    PAID: "Pago",
    PENDING: "Pendente",
  };

  return labels[status];
}
