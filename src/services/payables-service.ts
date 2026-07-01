import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function dayRange(offset: number) {
  const start = new Date();
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export const payablesService = {
  async listPayables(userId: string) {
    const today = dayRange(0);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    const monthEnd = new Date(today.start.getFullYear(), today.start.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const base: Prisma.TransactionWhereInput = { userId, status: { in: ["PENDING", "OVERDUE"] }, type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] } };

    const [todayItems, weekItems, monthItems] = await Promise.all([
      prisma.transaction.findMany({ where: { ...base, dueDate: { gte: today.start, lte: today.end } }, orderBy: { dueDate: "asc" } }),
      prisma.transaction.findMany({ where: { ...base, dueDate: { gt: today.end, lte: weekEnd } }, orderBy: { dueDate: "asc" } }),
      prisma.transaction.findMany({ where: { ...base, dueDate: { gt: weekEnd, lte: monthEnd } }, orderBy: { dueDate: "asc" } }),
    ]);

    return { today: todayItems, week: weekItems, month: monthItems };
  },

  async listReceivables(userId: string) {
    const today = dayRange(0);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    const monthEnd = new Date(today.start.getFullYear(), today.start.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const base: Prisma.TransactionWhereInput = { userId, status: { in: ["PENDING", "OVERDUE"] }, type: "INCOME" };

    const [todayItems, weekItems, monthItems] = await Promise.all([
      prisma.transaction.findMany({ where: { ...base, date: { gte: today.start, lte: today.end } }, orderBy: { date: "asc" } }),
      prisma.transaction.findMany({ where: { ...base, date: { gt: today.end, lte: weekEnd } }, orderBy: { date: "asc" } }),
      prisma.transaction.findMany({ where: { ...base, date: { gt: weekEnd, lte: monthEnd } }, orderBy: { date: "asc" } }),
    ]);

    return { today: todayItems, week: weekItems, month: monthItems };
  },

  async markAsPaid(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.update({
      where: { id: transactionId, userId },
      data: { status: "PAID", paidAt: new Date() },
    });

    if (transaction.sourceType === "Income" && transaction.sourceId) {
      await prisma.income.updateMany({ where: { userId, id: transaction.sourceId }, data: { status: "PAID" } });
    }
    if (transaction.sourceType === "Expense" && transaction.sourceId) {
      await prisma.expense.updateMany({ where: { userId, id: transaction.sourceId }, data: { status: "PAID" } });
    }
    if (transaction.sourceType === "CreditCardPurchase" && transaction.sourceId) {
      await prisma.creditCardPurchase.updateMany({ where: { userId, id: transaction.sourceId }, data: { status: "PAID" } });
    }

    return transaction;
  },
};
