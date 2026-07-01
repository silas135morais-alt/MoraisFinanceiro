import type { Prisma, RecurrenceFrequency, TransactionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveTransactionStatus } from "@/lib/transaction-status";
import { getPagination, type ListParams } from "@/repositories/finance-repository";
import { addFrequency } from "@/services/operational-date-service";
import { syncTransaction } from "@/services/transaction-service";
import { incomeSchema } from "@/validators/finance";

type CreateIncomeOptions = {
  recurringTransactionId?: string;
  skipRecurringSetup?: boolean;
};

function advanceFrequency(date: Date, frequency: RecurrenceFrequency, times: number) {
  let next = new Date(date);

  for (let index = 0; index < times; index += 1) {
    next = addFrequency(next, frequency);
  }

  return next;
}

export const incomeService = {
  async list(userId: string, params: ListParams = {}) {
    const { skip, take, page, pageSize } = getPagination(params);
    const incomeWhere: Prisma.IncomeWhereInput = {
      userId,
      ...(params.q ? { title: { contains: params.q, mode: "insensitive" } } : {}),
      ...(params.status ? { status: params.status as TransactionStatus } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.accountId ? { accountId: params.accountId } : {}),
      ...(params.startDate || params.endDate
        ? {
            date: {
              ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
              ...(params.endDate ? { lte: new Date(params.endDate) } : {}),
            },
          }
        : {}),
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
      prisma.income.findMany({
        where: incomeWhere,
        include: { category: true, account: true, attachments: true },
        orderBy: { date: "desc" },
        skip,
        take,
      }),
      prisma.income.count({ where: incomeWhere }),
    ]);

    return { items, page, pageSize, total };
  },

  async create(userId: string, payload: unknown, options: CreateIncomeOptions = {}) {
    const parsed = incomeSchema.parse(payload);
    const { recurrenceFrequency = "MONTHLY", ...data } = parsed;
    const shouldCreateRecurringSeries = !options.skipRecurringSetup && data.isRecurring;
    const occurrenceCount = shouldCreateRecurringSeries ? 12 : 1;
    let recurringTransactionId = options.recurringTransactionId;
    const created = [];

    if (shouldCreateRecurringSeries) {
      const recurringTransaction = await prisma.recurringTransaction.create({
        data: {
          userId,
          title: data.title,
          amount: data.amount,
          type: "INCOME",
          frequency: recurrenceFrequency,
          startsAt: data.date,
          nextRunAt: advanceFrequency(data.date, recurrenceFrequency, occurrenceCount),
          categoryId: data.categoryId,
          accountId: data.accountId,
        },
      });
      recurringTransactionId = recurringTransaction.id;
    }

    for (let index = 0; index < occurrenceCount; index += 1) {
      const date = shouldCreateRecurringSeries ? advanceFrequency(data.date, recurrenceFrequency, index) : data.date;
      const status = resolveTransactionStatus(data.status, date);
      const income = await prisma.income.create({
        data: {
          ...data,
          date,
          isRecurring: shouldCreateRecurringSeries || data.isRecurring,
          recurrenceOccurrenceDate: shouldCreateRecurringSeries ? date : undefined,
          recurringTransactionId,
          status,
          userId,
        },
      });
      const transaction = await syncTransaction({
        userId,
        accountId: income.accountId,
        categoryId: income.categoryId,
        type: "INCOME",
        status,
        title: income.title,
        amount: income.amount,
        date: income.date,
        description: income.description,
        paidAt: income.status === "PAID" ? income.date : null,
        sourceId: income.id,
        sourceType: "Income",
      });

      created.push(
        await prisma.income.update({
          where: { id: income.id, userId },
          data: { transactionId: transaction.id },
        }),
      );
    }

    return occurrenceCount === 1 ? created[0] : created;
  },

  async update(userId: string, id: string, payload: unknown) {
    const parsed = incomeSchema.partial().parse(payload);
    const { recurrenceFrequency, ...data } = parsed;
    void recurrenceFrequency;
    const currentIncome = await prisma.income.findUniqueOrThrow({ where: { id, userId } });
    const status = resolveTransactionStatus(data.status ?? currentIncome.status, data.date ?? currentIncome.date);
    const income = await prisma.income.update({ where: { id, userId }, data: { ...data, status } });
    await syncTransaction({
      userId,
      accountId: income.accountId,
      categoryId: income.categoryId,
      type: "INCOME",
      status,
      title: income.title,
      amount: income.amount,
      date: income.date,
      description: income.description,
      paidAt: income.status === "PAID" ? income.date : null,
      sourceId: income.id,
      sourceType: "Income",
    });

    return income;
  },

  async duplicate(userId: string, id: string) {
    const income = await prisma.income.findUniqueOrThrow({ where: { id, userId } });

    return this.create(userId, {
      title: `${income.title} (cópia)`,
      categoryId: income.categoryId,
      accountId: income.accountId,
      amount: income.amount.toNumber(),
      date: income.date.toISOString(),
      description: income.description,
      isRecurring: income.isRecurring,
      status: income.status,
    });
  },

  async remove(userId: string, id: string) {
    await prisma.transaction.deleteMany({ where: { userId, sourceType: "Income", sourceId: id } });
    return prisma.income.delete({ where: { id, userId } });
  },
};
