import { getMonthRange } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";
import { accountService } from "@/services/account-service";
import { summarizeCreditCardInvoices } from "@/services/payables-service";

type ChartTransaction = {
  amount: { toNumber(): number };
  type: string;
  date: Date;
  paidAt: Date | null;
};

function buildWeeklyCashFlow(transactions: ChartTransaction[], startsAt: Date, endsAt: Date) {
  return Array.from({ length: 5 }, (_, index) => {
    const weekStart = new Date(startsAt);
    weekStart.setUTCDate(1 + index * 7);
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekEnd = new Date(startsAt);
    weekEnd.setUTCDate(7 + index * 7);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const boundedEnd = weekEnd < endsAt ? weekEnd : endsAt;
    return transactions.reduce((sum, transaction) => {
      const transactionDate = transaction.paidAt ?? transaction.date;
      if (transactionDate < weekStart || transactionDate > boundedEnd) return sum;
      return sum + (transaction.type === "INCOME" ? transaction.amount.toNumber() : -transaction.amount.toNumber());
    }, 0);
  });
}

export async function getDashboard(userId: string, date = new Date()) {
  const { startsAt, endsAt } = getMonthRange(date);

  const now = new Date();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dueStart = startsAt > today ? startsAt : today;
  const projectionStart = endsAt < today ? null : startsAt > today ? startsAt : now;
  const projectionEnd = projectionStart ? new Date(projectionStart) : null;
  projectionEnd?.setUTCDate(projectionEnd.getUTCDate() + 30);
  const futureWindow = projectionStart && projectionEnd
    ? { OR: [{ dueDate: { gt: projectionStart, lte: projectionEnd } }, { dueDate: null, date: { gt: projectionStart, lte: projectionEnd } }] }
    : { id: "__no_future_window_for_historical_month__" };

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
    status: { not: "CANCELED" as const },
    OR: [
      { paidAt: { gte: startsAt, lte: endsAt } },
      { dueDate: { gte: startsAt, lte: endsAt } },
      { dueDate: null, date: { gte: startsAt, lte: endsAt } },
    ],
  };

  const [
    paidMonthTransactions,
    expenses,
    openCardTransactions,
    currentInvoiceTransactions,
    investments,
    assets,
    accounts,
    upcoming,
    latest,
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
      prisma.transaction.findMany({
        where: {
          userId,
          sourceType: "CreditCardPurchase",
          type: "CREDIT_CARD_PURCHASE",
          status: { notIn: ["PAID", "CANCELED"] },
          dueDate: { gte: startsAt, lte: endsAt },
        },
      }),
      prisma.investment.findMany({ where: { userId, isArchived: false }, include: { contributions: true } }),
      prisma.asset.findMany({ where: { userId, isArchived: false } }),
      accountService.listWithBalances(userId),
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
        where: { userId, type: "INCOME", status: "PENDING", ...futureWindow },
      }),
      prisma.transaction.findMany({
        where: { userId, type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] }, status: "PENDING", ...futureWindow },
      }),
    ]);

  const incomeTotal = paidMonthTransactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const incomeReceivedTotal = paidMonthTransactions
    .filter((transaction) => transaction.type === "INCOME" && transaction.sourceType !== "InvestmentRedemption")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const redemptionsTotal = paidMonthTransactions
    .filter((transaction) => transaction.type === "INCOME" && transaction.sourceType === "InvestmentRedemption")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount.toNumber(), 0);
  const paidExpensesTotal = paidMonthTransactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const paidCardsTotal = paidMonthTransactions
    .filter((transaction) => transaction.type === "CREDIT_CARD_PURCHASE")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const paidInvestmentsTotal = paidMonthTransactions
    .filter((transaction) => transaction.type === "INVESTMENT_CONTRIBUTION")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const paidOutflowTotal = paidExpensesTotal + paidCardsTotal + paidInvestmentsTotal;
  const cardsTotal = openCardTransactions.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const currentInvoiceTotal = currentInvoiceTransactions.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
  const investmentsTotal = investments.reduce((sum, investment) => {
    const contributionTotal = investment.contributions.reduce((total, contribution) => total + contribution.amount.toNumber(), 0);

    return sum + Math.max(investment.currentValue.toNumber(), contributionTotal);
  }, 0);
  const assetsTotal = assets.reduce((sum, asset) => sum + asset.value.toNumber(), 0);
  const cashTotal = accounts.reduce((sum, account) => sum + account.balance, 0);
  const futureIncomeTotal = futureIncome.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const futureExpenseTotal = futureExpense.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const realizedMonthTotal = incomeTotal - paidOutflowTotal;
  const balanceTotal = realizedMonthTotal;
  const summarizedUpcoming = await summarizeCreditCardInvoices(userId, upcoming);
  const weeklyCashFlow = buildWeeklyCashFlow(paidMonthTransactions, startsAt, endsAt);

  return {
    summary: {
      balance: balanceTotal,
      realizedMonth: realizedMonthTotal,
      incomes: incomeTotal,
      expenses: expenseTotal,
      cards: cardsTotal,
      currentInvoice: currentInvoiceTotal,
      investments: investmentsTotal,
      assets: assetsTotal,
      cashTotal,
      netWorth: balanceTotal + investmentsTotal + assetsTotal - cardsTotal,
      dueSoon: summarizedUpcoming.length,
      overdue: overdue.length,
      projectedBalance: balanceTotal + futureIncomeTotal - futureExpenseTotal,
      futureIncomes: futureIncomeTotal,
      futureExpenses: futureExpenseTotal,
      incomeReceived: incomeReceivedTotal,
      redemptions: redemptionsTotal,
      paidExpenses: paidExpensesTotal,
      paidCards: paidCardsTotal,
      paidInvestments: paidInvestmentsTotal,
      paidOutflows: paidOutflowTotal,
      balanceBreakdown: [
        { label: "Receitas recebidas", amount: incomeReceivedTotal, kind: "in" },
        { label: "Resgates", amount: redemptionsTotal, kind: "in" },
        { label: "Despesas e contas pagas", amount: paidExpensesTotal, kind: "out" },
        { label: "Faturas pagas", amount: paidCardsTotal, kind: "out" },
        { label: "Aportes em investimentos", amount: paidInvestmentsTotal, kind: "out" },
      ],
    },
    accounts,
    upcoming: summarizedUpcoming,
    latest,
    charts: {
      cashFlow: weeklyCashFlow,
      incomeExpense: [incomeTotal, paidExpensesTotal, paidCardsTotal, paidInvestmentsTotal],
      wealthEvolution: [cashTotal, investmentsTotal, assetsTotal],
    },
  };
}
