import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  categoryId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string | number;
  maxAmount?: string | number;
  type?: string;
};

export function getPagination(params: ListParams) {
  const page = Math.max(Number(params.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(params.pageSize ?? 20), 1), 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildTransactionWhere(userId: string, params: ListParams) {
  const where: Prisma.TransactionWhereInput = { userId };

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
      { category: { name: { contains: params.q, mode: "insensitive" } } },
      { account: { name: { contains: params.q, mode: "insensitive" } } },
    ];
  }

  if (params.status) where.status = params.status as Prisma.EnumTransactionStatusFilter["equals"];
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.accountId) where.accountId = params.accountId;
  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) where.date.gte = new Date(params.startDate);
    if (params.endDate) where.date.lte = new Date(params.endDate);
  }
  if (params.minAmount || params.maxAmount) {
    where.amount = {};
    if (params.minAmount) where.amount.gte = Number(params.minAmount);
    if (params.maxAmount) where.amount.lte = Number(params.maxAmount);
  }

  return where;
}

export const financeRepository = {
  listCategories(userId: string, type?: Prisma.CategoryWhereInput["type"]) {
    return prisma.category.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  },

  countCategoryUsage(userId: string, categoryId: string) {
    return Promise.all([
      prisma.income.count({ where: { userId, categoryId } }),
      prisma.expense.count({ where: { userId, categoryId } }),
      prisma.creditCardPurchase.count({ where: { userId, categoryId } }),
      prisma.budget.count({ where: { userId, categoryId } }),
      prisma.transaction.count({ where: { userId, categoryId } }),
    ]);
  },

  countAccountUsage(userId: string, accountId: string) {
    return Promise.all([
      prisma.income.count({ where: { userId, accountId } }),
      prisma.expense.count({ where: { userId, accountId } }),
      prisma.transaction.count({ where: { userId, accountId } }),
    ]);
  },

  countCardUsage(userId: string, cardId: string) {
    return prisma.creditCardPurchase.count({ where: { userId, cardId } });
  },
};
