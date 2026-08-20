import { prisma } from "@/lib/prisma";
import { accountService } from "@/services/account-service";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DiagnosticDebt = {
  id: string;
  name: string;
  outstandingBalance: number;
  installmentAmount: number;
  installments: number;
  currentInstallment: number;
  interestRate: number;
  nextDueDate: string;
  status: string;
};

export type FinancialDiagnosticData = {
  generatedAt: string;
  currentCash: number;
  futureIncome30d: number;
  futureOutflow30d: number;
  projectedCash30d: number;
  activeDebtBalance: number;
  debts: DiagnosticDebt[];
  upcoming: Array<{ id: string; title: string; amount: number; dueDate: string; type: string }>;
};

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWindow(date: Date) {
  return new Date(startOfDay(date).getTime() + 30 * DAY_MS + DAY_MS - 1);
}

export async function getFinancialDiagnostic(userId: string, referenceDate = new Date()): Promise<FinancialDiagnosticData> {
  const start = startOfDay(referenceDate);
  const end = endOfWindow(referenceDate);

  const [accounts, futureIncome, futureOutflow, upcomingTransactions, financings] = await Promise.all([
    accountService.listWithBalances(userId),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "INCOME",
        status: "PENDING",
        OR: [
          { dueDate: { gte: start, lte: end } },
          { dueDate: null, date: { gte: start, lte: end } },
        ],
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] },
        status: { in: ["PENDING", "OVERDUE"] },
        OR: [
          { dueDate: { gte: start, lte: end } },
          { dueDate: null, date: { gte: start, lte: end } },
        ],
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] },
        status: { in: ["PENDING", "OVERDUE"] },
        OR: [
          { dueDate: { gte: start, lte: end } },
          { dueDate: null, date: { gte: start, lte: end } },
        ],
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.financing.findMany({
      where: { userId, isActive: true },
      orderBy: [{ status: "desc" }, { nextDueDate: "asc" }],
    }),
  ]);

  const currentCash = accounts.reduce((sum, account) => sum + account.balance, 0);
  const futureIncome30d = futureIncome.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const futureOutflow30d = futureOutflow.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const activeDebtBalance = financings.reduce((sum, item) => sum + item.outstandingBalance.toNumber(), 0);

  return {
    generatedAt: new Date().toISOString(),
    currentCash,
    futureIncome30d,
    futureOutflow30d,
    projectedCash30d: currentCash + futureIncome30d - futureOutflow30d,
    activeDebtBalance,
    debts: financings.map((item) => ({
      id: item.id,
      name: item.name,
      outstandingBalance: item.outstandingBalance.toNumber(),
      installmentAmount: item.installmentAmount.toNumber(),
      installments: item.installments,
      currentInstallment: item.currentInstallment,
      interestRate: item.interestRate.toNumber(),
      nextDueDate: item.nextDueDate.toISOString(),
      status: item.status,
    })),
    upcoming: upcomingTransactions.map((item) => ({
      id: item.id,
      title: item.title,
      amount: item.amount.toNumber(),
      dueDate: (item.dueDate ?? item.date).toISOString(),
      type: item.type,
    })),
  };
}
