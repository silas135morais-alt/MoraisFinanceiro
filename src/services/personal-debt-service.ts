import { prisma } from "@/lib/prisma";
import { personalDebtSchema } from "@/validators/finance";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30;

const priorityRank: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

type DecimalLike = { toNumber(): number };

type PersonalDebtCalculationInput = {
  outstandingBalance: DecimalLike;
  interestRate: DecimalLike;
  interestBaseBalance: DecimalLike | null;
  interestStartedAt: Date | null;
};

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function roundMoney(value: number) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

export function calculatePersonalDebtBalance(item: PersonalDebtCalculationInput, asOf = new Date()) {
  const recordedBalance = roundMoney(item.outstandingBalance.toNumber());
  const monthlyRate = Math.max(0, item.interestRate.toNumber());
  const baseBalance = roundMoney(item.interestBaseBalance?.toNumber() ?? recordedBalance);

  if (monthlyRate <= 0 || !item.interestStartedAt || baseBalance <= 0) {
    return {
      balance: recordedBalance,
      baseBalance: recordedBalance,
      accruedInterest: 0,
      daysAccrued: 0,
      dailyRate: 0,
    };
  }

  const start = startOfDay(item.interestStartedAt);
  const end = startOfDay(asOf);
  const daysAccrued = Math.max(0, Math.floor((end.getTime() - start.getTime()) / DAY_MS));
  const dailyRate = Math.pow(1 + monthlyRate / 100, 1 / DAYS_PER_MONTH) - 1;
  const balance = roundMoney(baseBalance * Math.pow(1 + dailyRate, daysAccrued));

  return {
    balance,
    baseBalance,
    accruedInterest: roundMoney(balance - baseBalance),
    daysAccrued,
    dailyRate,
  };
}

function isOverdue(dueDate: Date | null, status: string) {
  return status === "OPEN" && Boolean(dueDate && dueDate.getTime() < Date.now());
}

export const personalDebtService = {
  async list(userId: string) {
    const items = await prisma.personalDebt.findMany({
      where: { userId, status: "OPEN" },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    return items.sort((a, b) => {
      const overdueDifference = Number(isOverdue(b.dueDate, b.status)) - Number(isOverdue(a.dueDate, a.status));
      if (overdueDifference !== 0) return overdueDifference;
      const priorityDifference = priorityRank[a.priority] - priorityRank[b.priority];
      if (priorityDifference !== 0) return priorityDifference;
      const interestDifference = b.interestRate.toNumber() - a.interestRate.toNumber();
      if (interestDifference !== 0) return interestDifference;
      return (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
    });
  },

  async create(userId: string, payload: unknown) {
    const data = personalDebtSchema.parse(payload);
    const now = new Date();
    return prisma.personalDebt.create({
      data: {
        ...data,
        userId,
        interestBaseBalance: data.outstandingBalance,
        interestStartedAt: data.interestRate > 0 ? now : null,
      },
    });
  },

  async update(userId: string, id: string, payload: unknown) {
    const data = personalDebtSchema.partial().parse(payload);
    const existing = await prisma.personalDebt.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Dívida não encontrada");

    const balanceChanged = data.outstandingBalance !== undefined && Number(data.outstandingBalance) !== existing.outstandingBalance.toNumber();
    const rateChanged = data.interestRate !== undefined && Number(data.interestRate) !== existing.interestRate.toNumber();
    const resetsInterestClock = balanceChanged || rateChanged;
    const nextRate = data.interestRate ?? existing.interestRate.toNumber();
    const nextBalance = data.outstandingBalance ?? existing.outstandingBalance.toNumber();
    const interestReset = resetsInterestClock
      ? {
          interestBaseBalance: nextBalance,
          interestStartedAt: nextRate > 0 ? new Date() : null,
        }
      : {};

    return prisma.personalDebt.update({
      where: { id: existing.id },
      data: { ...data, ...interestReset },
    });
  },

  async markPaid(userId: string, id: string) {
    const existing = await prisma.personalDebt.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Dívida não encontrada");
    return prisma.personalDebt.update({
      where: { id: existing.id },
      data: { outstandingBalance: 0, interestBaseBalance: 0, interestStartedAt: null, status: "PAID" },
    });
  },

  async cancel(userId: string, id: string) {
    const existing = await prisma.personalDebt.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Dívida não encontrada");
    return prisma.personalDebt.update({ where: { id: existing.id }, data: { status: "CANCELED" } });
  },
};

export function serializePersonalDebt(item: {
  id: string;
  creditor: string;
  title: string;
  originalAmount: DecimalLike;
  outstandingBalance: DecimalLike;
  interestRate: DecimalLike;
  interestBaseBalance: DecimalLike | null;
  interestStartedAt: Date | null;
  dueDate: Date | null;
  priority: string;
  status: string;
  notes: string | null;
}, asOf = new Date()) {
  const calculation = calculatePersonalDebtBalance(item, asOf);
  return {
    id: item.id,
    creditor: item.creditor,
    title: item.title,
    originalAmount: item.originalAmount.toNumber(),
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
    notes: item.notes,
  };
}
