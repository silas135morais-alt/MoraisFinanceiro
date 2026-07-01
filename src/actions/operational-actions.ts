"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-guard";
import { monthClosingService } from "@/services/month-closing-service";
import { payablesService } from "@/services/payables-service";
import { installmentService } from "@/services/installment-service";
import { notificationService } from "@/services/notification-service";

export async function closeMonthAction(monthId: string) {
  await monthClosingService.confirm(await requireUserId(), monthId);
  revalidatePath("/app");
  revalidatePath("/app/fechamento");
}

export async function markTransactionPaidAction(transactionId: string) {
  await payablesService.markAsPaid(await requireUserId(), transactionId);
  revalidatePath("/app");
  revalidatePath("/app/contas-a-pagar");
  revalidatePath("/app/contas-a-receber");
}

export async function anticipateInstallmentAction(purchaseId: string) {
  await installmentService.anticipate(await requireUserId(), purchaseId);
  revalidatePath("/app/cartoes");
}

export async function markNotificationReadAction(id: string) {
  await notificationService.markAsRead(await requireUserId(), id);
  revalidatePath("/app/notificacoes");
}
