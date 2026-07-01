import type { ExpenseType, Prisma, RecurrenceFrequency, TransactionStatus } from "@prisma/client";

import { addMonths } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";
import { resolveTransactionStatus } from "@/lib/transaction-status";
import { getPagination, type ListParams } from "@/repositories/finance-repository";
import { addFrequency } from "@/services/operational-date-service";
import { syncTransaction } from "@/services/transaction-service";
import { expenseSchema } from "@/validators/finance";

type CreateExpenseOptions = {
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

export const expenseService = {
  async list(userId: string, params: ListParams = {}) {
    const { skip, take, page, pageSize } = getPagination(params);
    const where: Prisma.ExpenseWhereInput = {
      userId,
      ...(params.q ? { title: { contains: params.q, mode: "insensitive" as const } } : {}),
      ...(params.status ? { status: params.status as TransactionStatus } : {}),
      ...(params.type ? { type: params.type as ExpenseType } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.accountId ? { accountId: params.accountId } : {}),
      ...(params.startDate || params.endDate
        ? {
            OR: [
              {
                dueDate: {
                  ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
                  ...(params.endDate ? { lte: new Date(params.endDate) } : {}),
                },
              },
              {
                dueDate: null,
                date: {
                  ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
                  ...(params.endDate ? { lte: new Date(params.endDate) } : {}),
                },
              },
            ],
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
      prisma.expense.findMany({
        where,
        include: { category: true, account: true, attachments: true },
        orderBy: [{ dueDate: "asc" }, { date: "desc" }],
        skip,
        take,
      }),
      prisma.expense.count({ where }),
    ]);

    return { items, page, pageSize, total };
  },

  async create(userId: string, payload: unknown, options: CreateExpenseOptions = {}) {
    const parsed = expenseSchema.parse(payload);
    const { recurrenceFrequency = "MONTHLY", ...data } = parsed;
    const installments = data.type === "INSTALLMENT" || data.type === "FINANCING" ? data.installments ?? 1 : 1;
    const shouldCreateRecurringSeries =
      !options.skipRecurringSetup && (data.type === "FIXED" || data.type === "SUBSCRIPTION" || data.isRecurring) && data.type !== "INSTALLMENT" && data.type !== "FINANCING";
    const occurrenceCount = shouldCreateRecurringSeries ? 12 : installments;
    const amountPerOccurrence = installments > 1 ? Number(data.amount) / installments : Number(data.amount);
    let parentId: string | undefined;
    let recurringTransactionId = options.recurringTransactionId;
    const created = [];

    if (shouldCreateRecurringSeries) {
      const startsAt = data.dueDate ?? data.date;
      const recurringTransaction = await prisma.recurringTransaction.create({
        data: {
          userId,
          title: data.title,
          amount: data.amount,
          type: "EXPENSE",
          frequency: recurrenceFrequency,
          startsAt,
          nextRunAt: advanceFrequency(startsAt, recurrenceFrequency, occurrenceCount),
          categoryId: data.categoryId,
          accountId: data.accountId,
        },
      });
      recurringTransactionId = recurringTransaction.id;
    }

    for (let index = 0; index < occurrenceCount; index += 1) {
      const date = shouldCreateRecurringSeries ? advanceFrequency(data.date, recurrenceFrequency, index) : addMonths(data.date, index);
      const dueDate = shouldCreateRecurringSeries
        ? advanceFrequency(data.dueDate ?? data.date, recurrenceFrequency, index)
        : data.dueDate ? addMonths(data.dueDate, index) : addMonths(data.date, index);
      const status = resolveTransactionStatus(data.status, dueDate);
      const expense = await prisma.expense.create({
        data: {
          ...data,
          userId,
          amount: amountPerOccurrence,
          date,
          dueDate,
          installments: installments > 1 ? installments : undefined,
          installmentNumber: installments > 1 ? index + 1 : undefined,
          parentExpenseId: installments > 1 && index > 0 ? parentId : undefined,
          isRecurring: shouldCreateRecurringSeries || data.isRecurring,
          recurrenceOccurrenceDate: shouldCreateRecurringSeries ? dueDate : undefined,
          recurringTransactionId,
          status,
        },
      });

      if (installments > 1 && index === 0) parentId = expense.id;
      const transaction = await syncTransaction({
        userId,
        accountId: expense.accountId,
        categoryId: expense.categoryId,
        type: "EXPENSE",
        status,
        title: expense.title,
        amount: expense.amount,
        date: expense.date,
        dueDate: expense.dueDate,
        description: expense.description,
        paidAt: expense.status === "PAID" ? expense.date : null,
        sourceId: expense.id,
        sourceType: "Expense",
      });
      created.push(await prisma.expense.update({ where: { id: expense.id, userId }, data: { transactionId: transaction.id } }));
    }

    return created;
  },

  async update(userId: string, id: string, payload: unknown) {
    const parsed = expenseSchema.partial().parse(payload);
    const { recurrenceFrequency, ...data } = parsed;
    void recurrenceFrequency;
    const currentExpense = await prisma.expense.findUniqueOrThrow({ where: { id, userId } });
    const nextDueDate = data.dueDate ?? currentExpense.dueDate ?? data.date ?? currentExpense.date;
    const status = resolveTransactionStatus(data.status ?? currentExpense.status, nextDueDate);
    const expense = await prisma.expense.update({ where: { id, userId }, data: { ...data, status } });
    await syncTransaction({
      userId,
      accountId: expense.accountId,
      categoryId: expense.categoryId,
      type: "EXPENSE",
      status,
      title: expense.title,
      amount: expense.amount,
      date: expense.date,
      dueDate: expense.dueDate,
      description: expense.description,
      paidAt: expense.status === "PAID" ? expense.date : null,
      sourceId: expense.id,
      sourceType: "Expense",
    });
    return expense;
  },

  async remove(userId: string, id: string) {
    await prisma.transaction.deleteMany({ where: { userId, sourceType: "Expense", sourceId: id } });
    return prisma.expense.delete({ where: { id, userId } });
  },
};
