import { prisma } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";
import { notify } from "@/services/notification-service";
import { payablesService } from "@/services/payables-service";

export const installmentService = {
  async summary(userId: string, parentPurchaseId: string) {
    const installments = await prisma.creditCardPurchase.findMany({
      where: {
        userId,
        OR: [{ id: parentPurchaseId }, { parentPurchaseId }],
      },
      orderBy: { installmentNumber: "asc" },
    });

    return {
      installments,
      total: installments.length,
      paid: installments.filter((item) => item.status === "PAID").length,
      remaining: installments.filter((item) => item.status !== "PAID").length,
    };
  },

  async anticipate(userId: string, purchaseId: string) {
    const purchase = await prisma.creditCardPurchase.update({
      where: { id: purchaseId, userId },
      data: { isAnticipated: true, status: "PAID" },
    });
    await prisma.transaction.updateMany({
      where: { userId, sourceType: "CreditCardPurchase", sourceId: purchase.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    await notify({ userId, type: "SUCCESS", title: "Parcela antecipada", message: `${purchase.title} foi antecipada.` });
    await logAudit({ userId, action: "PAID", entity: "CreditCardPurchase", entityId: purchase.id, message: "Parcela quitada antecipadamente." });
    return purchase;
  },

  async payoff(userId: string, parentPurchaseId: string) {
    const summary = await this.summary(userId, parentPurchaseId);
    const ids = summary.installments.map((item) => item.id);
    await prisma.creditCardPurchase.updateMany({
      where: { userId, id: { in: ids } },
      data: { status: "PAID", isAnticipated: true },
    });
    await Promise.all(
      ids.map((id) =>
        prisma.transaction.updateMany({
          where: { userId, sourceType: "CreditCardPurchase", sourceId: id },
          data: { status: "PAID", paidAt: new Date() },
        }),
      ),
    );
    await logAudit({ userId, action: "PAID", entity: "CreditCardPurchase", entityId: parentPurchaseId, message: "Parcelamento quitado integralmente." });
    return this.summary(userId, parentPurchaseId);
  },

  markTransactionAsPaid: payablesService.markAsPaid,
};
