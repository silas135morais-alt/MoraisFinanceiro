import { prisma } from "@/lib/prisma";
import { accountService } from "@/services/account-service";
import { getDriverProfile, serializeDriverProfile } from "@/services/driver-profile-service";
import { calculatePersonalDebtBalance } from "@/services/personal-debt-service";

const DAY_MS = 24 * 60 * 60 * 1000;

type DecimalLike = { toNumber(): number };

export type DiagnosticFinancing = {
  id: string;
  name: string;
  source: "FINANCING";
  outstandingBalance: number;
  installmentAmount: number;
  installments: number;
  currentInstallment: number;
  interestRate: number;
  nextDueDate: string;
  status: string;
};

export type DiagnosticPersonalDebt = {
  id: string;
  creditor: string;
  title: string;
  source: "PERSONAL_DEBT";
  outstandingBalance: number;
  recordedBalance: number;
  interestBaseBalance: number;
  interestRate: number;
  interestStartedAt: string | null;
  accruedInterest: number;
  daysAccrued: number;
  dueDate: string | null;
  priority: string;
  status: string;
};

export type FinancialDiagnosticData = {
  generatedAt: string;
  currentCash: number;
  receivedIncome30d: number;
  futureIncome30d: number;
  transactionOutflow30d: number;
  personalDebtDue30d: number;
  futureOutflow30d: number;
  projectedCash30d: number;
  minimumReserve: number;
  safeCash30d: number;
  activeDebtBalance: number;
  financingBalance: number;
  personalDebtBalance: number;
  financings: DiagnosticFinancing[];
  personalDebts: DiagnosticPersonalDebt[];
  debts: Array<DiagnosticFinancing | DiagnosticPersonalDebt>;
  driverProfile: ReturnType<typeof serializeDriverProfile>;
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

async function listPersonalDebtsSafely(userId: string) {
  try {
    return await prisma.personalDebt.findMany({
      where: { userId, status: "OPEN" },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });
  } catch {
    // A migração pode estar aguardando aplicação no ambiente de produção.
    return [];
  }
}

function personalDebtRank(item: { priority: string; dueDate: Date | null; interestRate: DecimalLike }) {
  const priorityRank: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  const overdue = item.dueDate && item.dueDate.getTime() < Date.now() ? 0 : 1;
  return [overdue, priorityRank[item.priority] ?? 9, item.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER, -item.interestRate.toNumber()];
}

export async function getFinancialDiagnostic(userId: string, referenceDate = new Date()): Promise<FinancialDiagnosticData> {
  const start = startOfDay(referenceDate);
  const end = endOfWindow(referenceDate);

  const [accounts, receivedIncome, futureIncome, futureOutflow, upcomingTransactions, financings, personalDebts, driverProfile] = await Promise.all([
    accountService.listWithBalances(userId),
    prisma.transaction.findMany({
      where: { userId, type: "INCOME", status: "PAID", date: { gte: start, lte: end } },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "INCOME",
        status: "PENDING",
        OR: [{ dueDate: { gte: start, lte: end } }, { dueDate: null, date: { gte: start, lte: end } }],
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] },
        status: { in: ["PENDING", "OVERDUE"] },
        OR: [{ dueDate: { gte: start, lte: end } }, { dueDate: null, date: { gte: start, lte: end } }],
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] },
        status: { in: ["PENDING", "OVERDUE"] },
        OR: [{ dueDate: { gte: start, lte: end } }, { dueDate: null, date: { gte: start, lte: end } }],
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.financing.findMany({ where: { userId, isActive: true }, orderBy: [{ status: "desc" }, { nextDueDate: "asc" }] }),
    listPersonalDebtsSafely(userId),
    getDriverProfile(userId),
  ]);

  const currentCash = accounts.reduce((sum, account) => sum + account.balance, 0);
  const receivedIncome30d = receivedIncome.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const futureIncome30d = futureIncome.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const transactionOutflow30d = futureOutflow.reduce((sum, item) => sum + item.amount.toNumber(), 0);
  const personalDebtDue30d = personalDebts.reduce((sum, item) => {
    if (!item.dueDate || item.dueDate < start || item.dueDate > end) return sum;
    return sum + calculatePersonalDebtBalance(item, item.dueDate).balance;
  }, 0);
  const futureOutflow30d = transactionOutflow30d + personalDebtDue30d;
  const projectedCash30d = currentCash + futureIncome30d - futureOutflow30d;
  const minimumReserve = Number(driverProfile.minimumReserve);
  const safeCash30d = Math.max(0, projectedCash30d - minimumReserve);
  const financingBalance = financings.reduce((sum, item) => sum + item.outstandingBalance.toNumber(), 0);
  const personalDebtBalance = personalDebts.reduce((sum, item) => sum + calculatePersonalDebtBalance(item, referenceDate).balance, 0);
  const serializedFinancings: DiagnosticFinancing[] = financings.map((item) => ({
    id: item.id,
    name: item.name,
    source: "FINANCING",
    outstandingBalance: item.outstandingBalance.toNumber(),
    installmentAmount: item.installmentAmount.toNumber(),
    installments: item.installments,
    currentInstallment: item.currentInstallment,
    interestRate: item.interestRate.toNumber(),
    nextDueDate: item.nextDueDate.toISOString(),
    status: item.status,
  }));
  const serializedPersonalDebts: DiagnosticPersonalDebt[] = [...personalDebts]
    .sort((a, b) => {
      const left = personalDebtRank(a);
      const right = personalDebtRank(b);
      for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) return Number(left[index]) - Number(right[index]);
      }
      return 0;
    })
    .map((item) => {
      const calculation = calculatePersonalDebtBalance(item, referenceDate);
      return {
        id: item.id,
        creditor: item.creditor,
        title: item.title,
        source: "PERSONAL_DEBT" as const,
        outstandingBalance: calculation.balance,
        recordedBalance: item.outstandingBalance.toNumber(),
        interestBaseBalance: calculation.baseBalance,
        interestRate: item.interestRate.toNumber(),
        interestStartedAt: item.interestStartedAt?.toISOString() ?? null,
        accruedInterest: calculation.accruedInterest,
        daysAccrued: calculation.daysAccrued,
        dueDate: item.dueDate?.toISOString() ?? null,
        priority: item.priority,
        status: item.status,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    currentCash,
    receivedIncome30d,
    futureIncome30d,
    transactionOutflow30d,
    personalDebtDue30d,
    futureOutflow30d,
    projectedCash30d,
    minimumReserve,
    safeCash30d,
    activeDebtBalance: financingBalance + personalDebtBalance,
    financingBalance,
    personalDebtBalance,
    financings: serializedFinancings,
    personalDebts: serializedPersonalDebts,
    debts: [...serializedPersonalDebts, ...serializedFinancings],
    driverProfile: serializeDriverProfile(driverProfile),
    upcoming: upcomingTransactions.map((item) => ({
      id: item.id,
      title: item.title,
      amount: item.amount.toNumber(),
      dueDate: (item.dueDate ?? item.date).toISOString(),
      type: item.type,
    })),
  };
}
