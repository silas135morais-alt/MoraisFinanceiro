import { prisma } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";
import { notify } from "@/services/notification-service";
import { addFrequency } from "@/services/operational-date-service";
import { incomeService } from "@/services/income-service";
import { expenseService } from "@/services/expense-service";
import { recurringTransactionSchema } from "@/validators/finance";

export const recurrenceService = {
  list(userId: string) {
    return prisma.recurringTransaction.findMany({
      where: { userId, isActive: true },
      orderBy: { nextRunAt: "asc" },
    });
  },

  create(userId: string, payload: unknown) {
    const data = recurringTransactionSchema.parse(payload);
    return prisma.recurringTransaction.create({ data: { ...data, userId } });
  },

  async generateDue(userId: string, until = new Date()) {
    const rules = await prisma.recurringTransaction.findMany({
      where: { userId, isActive: true, nextRunAt: { lte: until } },
    });

    const generated = [];

    for (const rule of rules) {
      if (rule.endsAt && rule.nextRunAt > rule.endsAt) continue;

      if (rule.type === "INCOME" && rule.categoryId && rule.accountId) {
        const income = await incomeService.create(
          userId,
          {
            title: rule.title,
            amount: rule.amount.toNumber(),
            categoryId: rule.categoryId,
            accountId: rule.accountId,
            date: rule.nextRunAt.toISOString(),
            isRecurring: true,
            status: "PENDING",
          },
          { recurringTransactionId: rule.id, skipRecurringSetup: true },
        );
        generated.push(income);
      }

      if (rule.type === "EXPENSE" && rule.categoryId && rule.accountId) {
        const expense = await expenseService.create(
          userId,
          {
            title: rule.title,
            amount: rule.amount.toNumber(),
            categoryId: rule.categoryId,
            accountId: rule.accountId,
            date: rule.nextRunAt.toISOString(),
            dueDate: rule.nextRunAt.toISOString(),
            type: "FIXED",
            isRecurring: true,
            status: "PENDING",
          },
          { recurringTransactionId: rule.id, skipRecurringSetup: true },
        );
        generated.push(expense);
      }

      await prisma.recurringTransaction.update({
        where: { id: rule.id, userId },
        data: { nextRunAt: addFrequency(rule.nextRunAt, rule.frequency) },
      });

      await notify({
        userId,
        type: "SUCCESS",
        title: "Recorrência gerada",
        message: `${rule.title} foi criada automaticamente.`,
      });
    }

    if (generated.length) {
      await logAudit({
        userId,
        action: "CREATED",
        entity: "RecurringTransaction",
        message: `${generated.length} ocorrência(s) recorrente(s) gerada(s).`,
      });
    }

    return generated;
  },

  updateOccurrenceOnly(userId: string, source: "income" | "expense", id: string, payload: unknown) {
    return source === "income"
      ? incomeService.update(userId, id, payload)
      : expenseService.update(userId, id, payload);
  },

  updateSeries(userId: string, id: string, payload: unknown) {
    const data = recurringTransactionSchema.partial().parse(payload);
    return prisma.recurringTransaction.update({ where: { id, userId }, data });
  },
};
