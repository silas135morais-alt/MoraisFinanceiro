import type { Prisma, TransactionStatus } from "@prisma/client";

import { addMonths } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";
import { financeRepository, getPagination, type ListParams } from "@/repositories/finance-repository";
import { syncTransaction } from "@/services/transaction-service";
import { creditCardPurchaseSchema, creditCardSchema } from "@/validators/finance";

export const creditCardService = {
  async list(userId: string, params: ListParams = {}) {
    const cards = await prisma.creditCard.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: "asc" },
    });
    const invoiceWhere: Prisma.TransactionWhereInput = {
      userId,
      sourceType: "CreditCardPurchase",
      type: "CREDIT_CARD_PURCHASE",
      status: { notIn: ["PAID", "CANCELED"] },
      ...(params.startDate || params.endDate
        ? {
            dueDate: {
              ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
              ...(params.endDate ? { lte: new Date(params.endDate) } : {}),
            },
          }
        : {}),
    };
    const openInstallments = await prisma.transaction.findMany({
      where: invoiceWhere,
      select: { amount: true, sourceId: true },
    });
    const retainedInstallments = await prisma.transaction.findMany({
      where: {
        userId,
        sourceType: "CreditCardPurchase",
        type: "CREDIT_CARD_PURCHASE",
        status: { notIn: ["PAID", "CANCELED"] },
      },
      select: { amount: true, sourceId: true },
    });
    const purchaseIds = [...openInstallments, ...retainedInstallments].map((item) => item.sourceId).filter(Boolean) as string[];
    const purchases = purchaseIds.length
      ? await prisma.creditCardPurchase.findMany({ where: { userId, id: { in: purchaseIds } }, select: { id: true, cardId: true } })
      : [];
    const cardByPurchase = new Map(purchases.map((purchase) => [purchase.id, purchase.cardId]));

    return cards.map((card) => {
      const invoiceUsed = openInstallments.reduce((sum, installment) => {
        return cardByPurchase.get(installment.sourceId ?? "") === card.id ? sum + installment.amount.toNumber() : sum;
      }, 0);
      const used = retainedInstallments.reduce((sum, installment) => {
        return cardByPurchase.get(installment.sourceId ?? "") === card.id ? sum + installment.amount.toNumber() : sum;
      }, 0);
      return {
        ...card,
        invoiceUsed,
        used,
        available: card.limit.toNumber() - used,
        nextInvoice: invoiceUsed,
      };
    });
  },

  create(userId: string, payload: unknown) {
    const data = creditCardSchema.parse(payload);
    return prisma.creditCard.create({ data: { ...data, userId } });
  },

  update(userId: string, id: string, payload: unknown) {
    const data = creditCardSchema.partial().parse(payload);
    return prisma.creditCard.update({ where: { id, userId }, data });
  },

  async remove(userId: string, id: string) {
    const usage = await financeRepository.countCardUsage(userId, id);
    if (usage > 0) {
      throw new Error("Cartão não pode ser excluído porque possui compras vinculadas.");
    }

    return prisma.creditCard.delete({ where: { id, userId } });
  },

  async listPurchases(userId: string, params: ListParams = {}) {
    const { skip, take, page, pageSize } = getPagination(params);
    const invoiceTransactions = params.startDate || params.endDate
      ? await prisma.transaction.findMany({
          where: {
            userId,
            sourceType: "CreditCardPurchase",
            dueDate: {
              ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
              ...(params.endDate ? { lte: new Date(params.endDate) } : {}),
            },
          },
          select: { dueDate: true, sourceId: true },
        })
      : await prisma.transaction.findMany({
          where: { userId, sourceType: "CreditCardPurchase" },
          select: { dueDate: true, sourceId: true },
        });
    const invoiceByPurchase = new Map(invoiceTransactions.map((transaction) => [transaction.sourceId, transaction.dueDate]));
    const invoicePurchaseIds = invoiceTransactions.map((transaction) => transaction.sourceId).filter(Boolean) as string[];
    const where: Prisma.CreditCardPurchaseWhereInput = {
      userId,
      ...(params.startDate || params.endDate ? { id: { in: invoicePurchaseIds.length ? invoicePurchaseIds : ["__none__"] } } : {}),
      ...(params.q ? { title: { contains: params.q, mode: "insensitive" as const } } : {}),
      ...(params.status ? { status: params.status as TransactionStatus } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.minAmount || params.maxAmount
        ? {
            amount: {
              ...(params.minAmount ? { gte: Number(params.minAmount) } : {}),
              ...(params.maxAmount ? { lte: Number(params.maxAmount) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.creditCardPurchase.findMany({
        where,
        include: { card: true, category: true },
        orderBy: { date: "desc" },
        skip,
        take,
      }),
      prisma.creditCardPurchase.count({ where }),
    ]);
    return {
      items: items.map((item) => ({ ...item, invoiceDueDate: invoiceByPurchase.get(item.id) ?? null })),
      page,
      pageSize,
      total,
    };
  },

  async createPurchase(userId: string, payload: unknown) {
    const parsed = creditCardPurchaseSchema.parse(payload);
    const { currentInstallment = 1, invoiceDate, ...data } = parsed;
    const card = await prisma.creditCard.findUniqueOrThrow({ where: { id: data.cardId, userId } });
    const installmentAmounts = splitInstallmentAmounts(Number(data.amount), data.installments);
    const firstInvoiceDate = invoiceDate ?? invoiceDueDate(data.date, card);
    const activeInstallment = Math.min(currentInstallment, data.installments);
    const invoiceAnchorDate = addMonths(firstInvoiceDate, -(activeInstallment - 1));
    let parentId: string | undefined;
    const purchases = [];

    for (let index = 0; index < data.installments; index += 1) {
      const installmentNumber = index + 1;
      const status = installmentNumber < activeInstallment ? "PAID" : data.status;
      const purchase = await prisma.creditCardPurchase.create({
        data: {
          ...data,
          userId,
          amount: installmentAmounts[index],
          date: data.date,
          installmentNumber,
          parentPurchaseId: index === 0 ? undefined : parentId,
          status,
        },
      });

      if (index === 0) parentId = purchase.id;
      const transaction = await syncTransaction({
        userId,
        categoryId: purchase.categoryId,
        type: "CREDIT_CARD_PURCHASE",
        status,
        title: purchase.title,
        amount: purchase.amount,
        date: purchase.date,
        dueDate: addMonths(invoiceAnchorDate, index),
        description: purchase.description,
        paidAt: status === "PAID" ? addMonths(invoiceAnchorDate, index) : null,
        sourceId: purchase.id,
        sourceType: "CreditCardPurchase",
      });
      purchases.push(await prisma.creditCardPurchase.update({ where: { id: purchase.id, userId }, data: { transactionId: transaction.id } }));
    }

    return purchases;
  },

  async updatePurchase(userId: string, id: string, payload: unknown) {
    const parsed = creditCardPurchaseSchema.partial().parse(payload);
    const { currentInstallment: _currentInstallment, invoiceDate, ...data } = parsed;
    void _currentInstallment;
    const purchase = await prisma.creditCardPurchase.update({ where: { id, userId }, data });
    const card = await prisma.creditCard.findUniqueOrThrow({ where: { id: purchase.cardId, userId } });

    await syncTransaction({
      userId,
      categoryId: purchase.categoryId,
      type: "CREDIT_CARD_PURCHASE",
      status: purchase.status,
      title: purchase.title,
      amount: purchase.amount,
      date: purchase.date,
      dueDate: invoiceDate ?? invoiceDueDate(purchase.date, card),
      description: purchase.description,
      paidAt: purchase.status === "PAID" ? new Date() : null,
      sourceId: purchase.id,
      sourceType: "CreditCardPurchase",
    });

    return purchase;
  },

  async markPurchasePaid(userId: string, id: string) {
    return this.updatePurchase(userId, id, { status: "PAID" });
  },

  async removePurchase(userId: string, id: string) {
    await prisma.transaction.deleteMany({ where: { userId, sourceType: "CreditCardPurchase", sourceId: id } });
    return prisma.creditCardPurchase.delete({ where: { id, userId } });
  },

  async payInvoice(userId: string, cardId: string, startDate: string, endDate: string) {
    const card = await prisma.creditCard.findUniqueOrThrow({ where: { id: cardId, userId } });
    const purchases = await prisma.creditCardPurchase.findMany({
      where: { userId, cardId: card.id },
      select: { id: true },
    });
    const purchaseIds = purchases.map((purchase) => purchase.id);

    if (!purchaseIds.length) {
      return { paid: 0, amount: 0 };
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        sourceType: "CreditCardPurchase",
        sourceId: { in: purchaseIds },
        status: { in: ["PENDING", "OVERDUE"] },
        dueDate: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: { amount: true, sourceId: true },
    });
    const sourceIds = transactions.map((transaction) => transaction.sourceId).filter(Boolean) as string[];
    const amount = transactions.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);

    if (!sourceIds.length) {
      return { paid: 0, amount: 0 };
    }

    await prisma.$transaction([
      prisma.transaction.updateMany({
        where: {
          userId,
          sourceType: "CreditCardPurchase",
          sourceId: { in: sourceIds },
        },
        data: { status: "PAID", paidAt: new Date() },
      }),
      prisma.creditCardPurchase.updateMany({
        where: { userId, id: { in: sourceIds } },
        data: { status: "PAID" },
      }),
    ]);

    return { paid: sourceIds.length, amount };
  },
};

function invoiceDueDate(date: Date, card: { closingDay: number; dueDay: number }) {
  const due = new Date(date);
  due.setMonth(due.getMonth() + (date.getDate() <= card.closingDay ? 1 : 2));
  due.setDate(Math.min(card.dueDay, 28));
  due.setHours(12, 0, 0, 0);
  return due;
}

function splitInstallmentAmounts(total: number, installments: number) {
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / installments);
  const remainder = totalCents % installments;

  return Array.from({ length: installments }, (_, index) => (baseCents + (index < remainder ? 1 : 0)) / 100);
}
