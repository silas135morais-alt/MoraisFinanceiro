import { prisma } from "@/lib/prisma";
import { logAudit } from "@/services/audit-service";
import { notify } from "@/services/notification-service";
import { addFrequency, formatMonthLabel } from "@/services/operational-date-service";
import { recurrenceService } from "@/services/recurrence-service";
import { syncTransaction } from "@/services/transaction-service";

function nextMonthRange(month: { startsAt: Date }) {
  const startsAt = new Date(month.startsAt);
  startsAt.setMonth(startsAt.getMonth() + 1);
  startsAt.setDate(1);
  startsAt.setHours(0, 0, 0, 0);

  const endsAt = new Date(startsAt);
  endsAt.setMonth(endsAt.getMonth() + 1);
  endsAt.setMilliseconds(-1);

  return { startsAt, endsAt, year: startsAt.getFullYear(), month: startsAt.getMonth() + 1 };
}

function toJsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export const monthClosingService = {
  async preview(userId: string, monthId: string) {
    const month = await prisma.month.findUniqueOrThrow({ where: { id: monthId, userId } });
    const [incomes, expenses, recurring, subscriptions, financings, budgets, cards, categories] =
      await Promise.all([
        prisma.income.count({ where: { userId, date: { gte: month.startsAt, lte: month.endsAt } } }),
        prisma.expense.count({ where: { userId, date: { gte: month.startsAt, lte: month.endsAt } } }),
        prisma.recurringTransaction.count({ where: { userId, isActive: true } }),
        prisma.subscription.count({ where: { userId, isActive: true } }),
        prisma.financing.count({ where: { userId, isActive: true } }),
        prisma.budget.count({ where: { userId, monthId } }),
        prisma.creditCard.count({ where: { userId, isArchived: false } }),
        prisma.category.count({ where: { userId, isActive: true } }),
      ]);

    return {
      month,
      willCopy: {
        recurring,
        subscriptions,
        financings,
        budgets,
        cards,
        categories,
      },
      willNotCopy: {
        oneTimeIncomesAndExpenses: incomes + expenses,
      },
    };
  },

  async confirm(userId: string, monthId: string) {
    const month = await prisma.month.findUniqueOrThrow({ where: { id: monthId, userId } });
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
    await prisma.month.update({ where: { id: month.id, userId }, data: { status: "CLOSED", closedAt: new Date() } });
    const closing = await prisma.monthClosing.upsert({
      where: { userId_monthId: { userId, monthId } },
      update: { nextMonthId: nextMonth.id, summary, confirmedAt: new Date() },
      create: {
        userId,
        monthId,
        nextMonthId: nextMonth.id,
        summary,
        confirmedAt: new Date(),
      },
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
      const expense = await prisma.expense.create({
        data: {
          userId,
          title: subscription.name,
          categoryId: subscription.categoryId,
          accountId: subscription.accountId,
          amount: subscription.amount,
          date: subscription.nextChargeAt,
          dueDate: subscription.nextChargeAt,
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
      const expense = await prisma.expense.create({
        data: {
          userId,
          title: financing.name,
          categoryId: financing.categoryId,
          accountId: financing.accountId,
          amount: financing.installmentAmount,
          date: financing.nextDueDate,
          dueDate: financing.nextDueDate,
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
