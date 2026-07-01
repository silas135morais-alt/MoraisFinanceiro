import type { TransactionStatus } from "@prisma/client";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function resolveTransactionStatus(status: TransactionStatus, dueDate?: Date | string | null) {
  if (status === "PAID" || status === "CANCELED" || !dueDate) return status;

  return new Date(dueDate) < startOfToday() ? "OVERDUE" : "PENDING";
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
