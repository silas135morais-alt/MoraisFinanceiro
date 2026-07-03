import { getMonthRange } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function getDashboard(userId: string, date = new Date()) {
  const { startsAt, endsAt } = getMonthRange(date);

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueStart = startsAt > today ? startsAt : today;
  const next30 = new Date();
  next30.setDate(next30.getDate() + 30);

  const monthlyExpenseWhere = {
    userId,
    status: { not: "CANCELED" as const },
    OR: [
      { dueDate: { gte: startsAt, lte: endsAt } },
      { dueDate: null, date: { gte: startsAt, lte: endsAt } },
    ],
  };
  const monthlyTransactionWhere = {
    userId,
    OR: [
      { dueDate: { gte: startsAt, lte: endsAt } },
      { dueDate: null, date: { gte: startsAt, lte: endsAt } },
    ],
  };

  const [
    paidMonthTransactions,
    expenses,
    openCardTransactions,
    investments,
    assets,
    upcoming,
    latest,
    budgets,
    overdue,
    futureIncome,
    futureExpense,
  ] =
    await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          status: "PAID",
          OR: [
            { paidAt: { gte: startsAt, lte: endsAt } },
            { paidAt: null, date: { gte: startsAt, lte: endsAt } },
            { paidAt: null, dueDate: { gte: startsAt, lte: endsAt } },
          ],
        },
      }),
      prisma.expense.findMany({ where: monthlyExpenseWhere }),
      prisma.transaction.findMany({
        where: {
          userId,
          sourceType: "CreditCardPurchase",
          type: "CREDIT_CARD_PURCHASE",
          status: { notIn: ["PAID", "CANCELED"] },
        },
      }),
      prisma.investment.findMany({ where: { userId, isArchived: false }, include: { contributions: true } }),
      prisma.asset.findMany({ where: { userId, isArchived: false } }),
      prisma.transaction.findMany({
        where: {
          userId,
          status: { in: ["PENDING", "OVERDUE"] },
          dueDate: { gte: dueStart, lte: endsAt },
          type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] },
        },
        orderBy: { dueDate: "asc" },
        take: 6,
      }),
      prisma.transaction.findMany({
        where: monthlyTransactionWhere,
        include: { category: true, account: true },
        orderBy: { date: "desc" },
        take: 8,
      }),
      prisma.budget.findMany({
        where: { userId },
        include: { category: true },
        take: 6,
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          status: { in: ["PENDING", "OVERDUE"] },
          type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] },
          OR: [
            { dueDate: { gte: startsAt, lte: endsAt, lt: today } },
            { dueDate: null, date: { gte: startsAt, lte: endsAt, lt: today } },
          ],
        },
        take: 20,
      }),
      prisma.transaction.findMany({
        where: { userId, type: "INCOME", status: "PENDING", date: { gt: now, lte: next30 } },
      }),
      prisma.transaction.findMany({
        where: { userId, type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] }, status: "PENDING", OR: [{ dueDate: { gt: now, lte: next30 } }, { date: { gt: now, lte: next30 } }] },
      }),
    ]);

  const incomeTotal = paidMonthTransactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount.toNumber(), 0);
  const paidOutflowTotal = paidMonthTransactions
    .filter((transaction) => transaction.type === "EXPENSE" || transaction.type === "CREDIT_CARD_PURCHASE")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const cardsTotal = openCardTransactions.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const investmentsTotal = investments.reduce((sum, investment) => {
    const contributionTotal = investment.contributions.reduce((total, contribution) => total + contribution.amount.toNumber(), 0);

    return sum + Math.max(investment.currentValue.toNumber(), contributionTotal);
  }, 0);
  const assetsTotal = assets.reduce((sum, asset) => sum + asset.value.toNumber(), 0);
  const futureIncomeTotal = futureIncome.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const futureExpenseTotal = futureExpense.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const realizedMonthTotal = incomeTotal - paidOutflowTotal;
  const balanceTotal = realizedMonthTotal;

  return {
    summary: {
      balance: balanceTotal,
      realizedMonth: realizedMonthTotal,
      incomes: incomeTotal,
      expenses: expenseTotal,
      cards: cardsTotal,
      investments: investmentsTotal,
      assets: assetsTotal,
      netWorth: balanceTotal + investmentsTotal + assetsTotal - cardsTotal,
      dueSoon: upcoming.length,
      overdue: overdue.length,
      projectedBalance: balanceTotal + futureIncomeTotal - futureExpenseTotal,
      futureIncomes: futureIncomeTotal,
      futureExpenses: futureExpenseTotal,
    },
    upcoming,
    latest,
    budgets,
    charts: {
      cashFlow: [38, 44, 52, 49, 61, 68, 64, 72, 78, 83, 88, 92],
      incomeExpense: [incomeTotal || 12, expenseTotal || 8, cardsTotal || 5, investmentsTotal ? 20 : 10],
      wealthEvolution: [42, 47, 51, 58, 63, 70, 76, 83, 89, 94],
    },
  };
}
