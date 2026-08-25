import { prisma } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";
import { notify } from "@/services/notification-service";
import { addFrequency, formatMonthLabel } from "@/services/operational-date-service";
import { recurrenceService } from "@/services/recurrence-service";
import { syncTransaction } from "@/services/transaction-service";
import { driverDailyEarningService } from "@/services/driver-daily-earning-service";

function nextMonthRange(month: { startsAt: Date }) {
  const startsAt = new Date(month.startsAt);
  startsAt.setUTCMonth(startsAt.getUTCMonth() + 1);
  startsAt.setUTCDate(1);
  startsAt.setUTCHours(0, 0, 0, 0);

  const endsAt = new Date(startsAt);
  endsAt.setUTCMonth(endsAt.getUTCMonth() + 1);
  endsAt.setUTCMilliseconds(-1);

  return { startsAt, endsAt, year: startsAt.getUTCFullYear(), month: startsAt.getUTCMonth() + 1 };
}

function toJsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export const monthClosingService = {
  async preview(userId: string, monthId: string) {
    const month = await prisma.month.findUniqueOrThrow({ where: { id: monthId, userId } });
    const [incomes, expenses, recurring, subscriptions, financings, budgets, cards, categories, driver] =
      await Promise.all([
        prisma.income.findMany({
          where: { userId, status: { not: "CANCELED" }, date: { gte: month.startsAt, lte: month.endsAt } },
          select: { amount: true, status: true },
        }),
        prisma.expense.findMany({
          where: { userId, status: { not: "CANCELED" }, date: { gte: month.startsAt, lte: month.endsAt } },
          select: { amount: true, status: true },
        }),
        prisma.recurringTransaction.count({ where: { userId, isActive: true } }),
        prisma.subscription.count({ where: { userId, isActive: true } }),
        prisma.financing.count({ where: { userId, isActive: true } }),
        prisma.budget.count({ where: { userId, monthId } }),
        prisma.creditCard.count({ where: { userId, isArchived: false } }),
        prisma.category.count({ where: { userId, isActive: true } }),
        driverDailyEarningService.list(userId, month.startsAt),
      ]);

    const incomeTotal = incomes.reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const incomeReceived = incomes.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const expenseTotal = expenses.reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const expensePaid = expenses.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const incomePending = incomes.filter((item) => item.status !== "PAID").reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const expensePending = expenses.filter((item) => item.status !== "PAID").reduce((sum, item) => sum + item.amount.toNumber(), 0);

    return {
      month,
      totals: {
        incomeTotal,
        incomeReceived,
        incomePending,
        expenseTotal,
        expensePaid,
        expensePending,
        realizedSurplus: incomeReceived - expensePaid,
        projectedSurplus: incomeTotal - expenseTotal,
      },
      driver: {
        daysWorked: driver.daysWorked,
        grossTotal: driver.grossTotal,
        fuelTotal: driver.fuelTotal,
        netTotal: driver.netTotal,
        targetTotal: driver.targetTotal,
        difference: driver.difference,
      },
      pending: {
        incomeCount: incomes.filter((item) => item.status !== "PAID").length,
        expenseCount: expenses.filter((item) => item.status !== "PAID").length,
        totalCount: incomes.filter((item) => item.status !== "PAID").length + expenses.filter((item) => item.status !== "PAID").length,
      },
      willCopy: {
        recurring,
        subscriptions,
        financings,
        budgets,
        cards,
        categories,
      },
      willNotCopy: {
        oneTimeIncomesAndExpenses: incomes.length + expenses.length,
      },
    };
  },

  async confirm(userId: string, monthId: string) {
    const month = await prisma.month.findUniqueOrThrow({ where: { id: monthId, userId } });
    const existingClosing = await prisma.monthClosing.findUnique({ where: { userId_monthId: { userId, monthId } } });
    if (existingClosing) return existingClosing;
    const range = nextMonthRange(month);
    const preview = await this.preview(userId, monthId);

    const nextMonth = await prisma.month.upsert({
      where: { userId_year_month: { userId, year: range.year, month: range.month } },
      update: { status: "OPEN", startsAt: range.startsAt, endsAt: range.endsAt },
      create: {
        userId,
        year: range.year,
        month: range.month,
        label: formatMonthLabel(range.startsAt),
        startsAt: range.startsAt,
        endsAt: range.endsAt,
      },
    });

    const budgets = await prisma.budget.findMany({ where: { userId, monthId } });
    await Promise.all(
      budgets.map((budget) =>
        prisma.budget.upsert({
          where: { userId_categoryId_monthId: { userId, categoryId: budget.categoryId, monthId: nextMonth.id } },
          update: { limit: budget.limit, alertPercent: budget.alertPercent },
          create: {
            userId,
            categoryId: budget.categoryId,
            monthId: nextMonth.id,
            limit: budget.limit,
            alertPercent: budget.alertPercent,
          },
        }),
      ),
    );

    await recurrenceService.generateDue(userId, nextMonth.endsAt);
    await this.generateSubscriptions(userId, nextMonth.endsAt);
    await this.generateFinancings(userId, nextMonth.endsAt);

    const summary = toJsonSafe(preview);
    const confirmedAt = new Date();
    const closing = await prisma.$transaction(async (tx) => {
      await tx.month.update({ where: { id: month.id, userId }, data: { status: "CLOSED", closedAt: confirmedAt } });
      return tx.monthClosing.create({
        data: {
          userId,
          monthId,
          nextMonthId: nextMonth.id,
          summary,
          confirmedAt,
        },
      });
    });

    await notify({
      userId,
      type: "SUCCESS",
      title: "Mes fechado",
      message: `${month.label} foi fechado e ${nextMonth.label} foi criado.`,
      href: "/app/fechamento",
    });
    await logAudit({
      userId,
      action: "CLOSED",
      entity: "Month",
      entityId: month.id,
      message: `Mes ${month.label} fechado.`,
    });

    return closing;
  },

  async generateSubscriptions(userId: string, until: Date) {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, isActive: true, nextChargeAt: { lte: until } },
    });

    for (const subscription of subscriptions) {
      const occurrenceMarker = `[auto-subscription:${subscription.id}:${subscription.nextChargeAt.toISOString()}]`;
      const existingOccurrence = await prisma.expense.findFirst({ where: { userId, description: occurrenceMarker } });
      if (existingOccurrence) {
        await prisma.subscription.update({
          where: { id: subscription.id, userId },
          data: { nextChargeAt: addFrequency(subscription.nextChargeAt, subscription.frequency) },
        });
        continue;
      }
      const expense = await prisma.expense.create({
        data: {
          userId,
          title: subscription.name,
          categoryId: subscription.categoryId,
          accountId: subscription.accountId,
          amount: subscription.amount,
          date: subscription.nextChargeAt,
          dueDate: subscription.nextChargeAt,
          description: occurrenceMarker,
          type: "SUBSCRIPTION",
          isRecurring: true,
          status: subscription.status,
        },
      });
      const transaction = await syncTransaction({
        userId,
        accountId: expense.accountId,
        categoryId: expense.categoryId,
        type: "EXPENSE",
        status: expense.status,
        title: expense.title,
        amount: expense.amount,
        date: expense.date,
        dueDate: expense.dueDate,
        sourceId: expense.id,
        sourceType: "Expense",
      });
      await prisma.expense.update({ where: { id: expense.id, userId }, data: { transactionId: transaction.id } });
      await prisma.subscription.update({
        where: { id: subscription.id, userId },
        data: { nextChargeAt: addFrequency(subscription.nextChargeAt, subscription.frequency) },
      });
    }

    return subscriptions.length;
  },

  async generateFinancings(userId: string, until: Date) {
    const financings = await prisma.financing.findMany({
      where: { userId, isActive: true, nextDueDate: { lte: until } },
    });

    for (const financing of financings) {
      const occurrenceMarker = `[auto-financing:${financing.id}:${financing.nextDueDate.toISOString()}]`;
      const existingOccurrence = await prisma.expense.findFirst({ where: { userId, description: occurrenceMarker } });
      if (existingOccurrence) {
        await prisma.financing.update({
          where: { id: financing.id, userId },
          data: {
            currentInstallment: Math.min(financing.currentInstallment + 1, financing.installments),
            outstandingBalance: Math.max(0, financing.outstandingBalance.toNumber() - financing.installmentAmount.toNumber()),
            nextDueDate: addFrequency(financing.nextDueDate, "MONTHLY"),
            isActive: financing.currentInstallment + 1 <= financing.installments,
          },
        });
        continue;
      }
      const expense = await prisma.expense.create({
        data: {
          userId,
          title: financing.name,
          categoryId: financing.categoryId,
          accountId: financing.accountId,
          amount: financing.installmentAmount,
          date: financing.nextDueDate,
          dueDate: financing.nextDueDate,
          description: occurrenceMarker,
          type: "FINANCING",
          installments: financing.installments,
          installmentNumber: financing.currentInstallment,
          status: financing.status,
        },
      });
      const transaction = await syncTransaction({
        userId,
        accountId: expense.accountId,
        categoryId: expense.categoryId,
        type: "EXPENSE",
        status: expense.status,
        title: expense.title,
        amount: expense.amount,
        date: expense.date,
        dueDate: expense.dueDate,
        sourceId: expense.id,
        sourceType: "Expense",
      });
      await prisma.expense.update({ where: { id: expense.id, userId }, data: { transactionId: transaction.id } });
      await prisma.financing.update({
        where: { id: financing.id, userId },
        data: {
          currentInstallment: Math.min(financing.currentInstallment + 1, financing.installments),
          outstandingBalance: Math.max(0, financing.outstandingBalance.toNumber() - financing.installmentAmount.toNumber()),
          nextDueDate: addFrequency(financing.nextDueDate, "MONTHLY"),
          isActive: financing.currentInstallment + 1 <= financing.installments,
        },
      });
    }

    return financings.length;
  },
};
