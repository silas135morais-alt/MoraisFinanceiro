import { prisma } from "@/lib/prisma";
import { syncTransaction } from "@/services/transaction-service";
import { getDriverProfile } from "@/services/driver-profile-service";
import { driverDailyEarningSchema } from "@/validators/finance";

const DRIVER_CATEGORY_NAME = "Motorista 99";
const FUEL_CATEGORY_NAME = "Gasolina";

type DecimalLike = { toNumber(): number };

type DailyEntry = {
  id: string;
  incomeId: string;
  date: Date;
  grossAmount: DecimalLike;
  targetAmount: DecimalLike;
  fuelAmount: DecimalLike;
  fuelExpenseId: string | null;
  notes: string | null;
  income: {
    accountId: string;
    account: { name: string };
  };
};

function businessDate(date: Date) {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function endOfToday() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

function dateLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function serialize(entry: DailyEntry) {
  const grossAmount = Number(entry.grossAmount);
  const targetAmount = Number(entry.targetAmount);
  const difference = grossAmount - targetAmount;
  return {
    id: entry.id,
    incomeId: entry.incomeId,
    date: entry.date.toISOString(),
    grossAmount,
    targetAmount,
    fuelAmount: Number(entry.fuelAmount),
    fuelExpenseId: entry.fuelExpenseId,
    difference,
    targetPercent: targetAmount > 0 ? (grossAmount / targetAmount) * 100 : 0,
    notes: entry.notes,
    accountId: entry.income.accountId,
    accountName: entry.income.account.name,
  };
}

async function getDriverCategory(userId: string) {
  return prisma.category.upsert({
    where: { userId_type_name: { userId, type: "INCOME", name: DRIVER_CATEGORY_NAME } },
    update: { isActive: true },
    create: { userId, type: "INCOME", name: DRIVER_CATEGORY_NAME, color: "#15803d", isDefault: false },
  });
}

async function getFuelCategory(userId: string) {
  return prisma.category.upsert({
    where: { userId_type_name: { userId, type: "EXPENSE", name: FUEL_CATEGORY_NAME } },
    update: { isActive: true },
    create: { userId, type: "EXPENSE", name: FUEL_CATEGORY_NAME, color: "#d97706", isDefault: false },
  });
}

async function syncFuelExpense({
  userId,
  fuelExpenseId,
  accountId,
  date,
  fuelAmount,
}: {
  userId: string;
  fuelExpenseId: string | null;
  accountId: string;
  date: Date;
  fuelAmount: number;
}) {
  if (fuelAmount <= 0) {
    if (fuelExpenseId) {
      await prisma.transaction.deleteMany({ where: { userId, sourceType: "Expense", sourceId: fuelExpenseId } });
      await prisma.expense.delete({ where: { id: fuelExpenseId, userId } });
    }
    return null;
  }

  const category = await getFuelCategory(userId);
  const data = {
    categoryId: category.id,
    accountId,
    title: `Gasolina — 99 — ${dateLabel(date)}`,
    amount: fuelAmount,
    date,
    dueDate: null,
    description: "Despesa vinculada ao ganho diário da 99.",
    type: "ONE_TIME" as const,
    status: "PAID" as const,
    isRecurring: false,
  };
  const expense = fuelExpenseId
    ? await prisma.expense.update({ where: { id: fuelExpenseId, userId }, data })
    : await prisma.expense.create({ data: { ...data, userId } });
  const transaction = await syncTransaction({
    userId,
    accountId: expense.accountId,
    categoryId: expense.categoryId,
    type: "EXPENSE",
    status: "PAID",
    title: expense.title,
    amount: expense.amount,
    date: expense.date,
    dueDate: expense.dueDate,
    description: expense.description,
    paidAt: expense.date,
    sourceId: expense.id,
    sourceType: "Expense",
  });
  await prisma.expense.update({ where: { id: expense.id, userId }, data: { transactionId: transaction.id } });
  return expense.id;
}

async function getEntry(userId: string, id: string) {
  return prisma.driverDailyEarning.findFirst({
    where: { id, userId },
    include: { income: { select: { accountId: true, account: { select: { name: true } } } } },
  }) as Promise<DailyEntry | null>;
}

export const driverDailyEarningService = {
  async list(userId: string, referenceDate = new Date()) {
    const start = startOfMonth(referenceDate);
    const end = endOfMonth(referenceDate);
    const [items, profile] = await Promise.all([
      prisma.driverDailyEarning.findMany({
        where: { userId, date: { gte: start, lte: end } },
        include: { income: { select: { accountId: true, account: { select: { name: true } } } } },
        orderBy: { date: "desc" },
      }),
      getDriverProfile(userId),
    ]);
    const entries = items.map((item) => serialize(item as DailyEntry));
    const dailyTarget = Number(profile.dailyGrossTarget);
    const grossTotal = entries.reduce((sum, item) => sum + item.grossAmount, 0);
    const fuelTotal = entries.reduce((sum, item) => sum + item.fuelAmount, 0);
    const targetTotal = entries.reduce((sum, item) => sum + item.targetAmount, 0);
    return {
      month: `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`,
      dailyTarget,
      daysWorked: entries.length,
      grossTotal,
      fuelTotal,
      netTotal: grossTotal - fuelTotal,
      targetTotal,
      difference: grossTotal - targetTotal,
      entries,
    };
  },

  async upsert(userId: string, payload: unknown) {
    const data = driverDailyEarningSchema.parse(payload);
    const date = businessDate(data.date);
    if (date > endOfToday()) {
      throw new Error("O realizado só pode ser lançado para hoje ou para uma data passada.");
    }

    const [account, category, profile] = await Promise.all([
      prisma.financialAccount.findFirst({ where: { id: data.accountId, userId, isArchived: false } }),
      getDriverCategory(userId),
      getDriverProfile(userId),
    ]);
    if (!account) throw new Error("Conta de recebimento não encontrada.");

    const targetAmount = Number(profile.dailyGrossTarget);
    const fuelAmount = Number(data.fuelAmount ?? 0);
    const title = "99 — realizado do dia";
    const existing = data.id
      ? await prisma.driverDailyEarning.findFirst({ where: { id: data.id, userId } })
      : await prisma.driverDailyEarning.findUnique({ where: { userId_date: { userId, date } } });
    if (data.id && !existing) throw new Error("Registro diário não encontrado.");
    const recordedTarget = existing ? Number(existing.targetAmount) : targetAmount;
    let incomeId: string;

    if (existing) {
      const income = await prisma.income.update({
        where: { id: existing.incomeId, userId },
        data: {
          categoryId: category.id,
          accountId: account.id,
          title,
          amount: data.grossAmount,
          date,
          description: data.notes ?? null,
          isRecurring: false,
          status: "PAID",
        },
      });
      incomeId = income.id;
      await prisma.driverDailyEarning.update({
        where: { id: existing.id, userId },
        data: { date, grossAmount: data.grossAmount, targetAmount: recordedTarget, fuelAmount, notes: data.notes ?? null },
      });
    } else {
      const income = await prisma.income.create({
        data: {
          userId,
          categoryId: category.id,
          accountId: account.id,
          title,
          amount: data.grossAmount,
          date,
          description: data.notes ?? null,
          isRecurring: false,
          status: "PAID",
        },
      });
      incomeId = income.id;
      await prisma.driverDailyEarning.create({
        data: { userId, incomeId, date, grossAmount: data.grossAmount, targetAmount: recordedTarget, fuelAmount, notes: data.notes ?? null },
      });
    }

    const fuelExpenseId = await syncFuelExpense({
      userId,
      fuelExpenseId: existing?.fuelExpenseId ?? null,
      accountId: account.id,
      date,
      fuelAmount,
    });
    await prisma.driverDailyEarning.update({
      where: { incomeId },
      data: { fuelAmount, fuelExpenseId },
    });

    const income = await prisma.income.findUniqueOrThrow({ where: { id: incomeId } });
    await syncTransaction({
      userId,
      accountId: income.accountId,
      categoryId: income.categoryId,
      type: "INCOME",
      status: "PAID",
      title: income.title,
      amount: income.amount,
      date: income.date,
      description: income.description,
      paidAt: income.date,
      sourceId: income.id,
      sourceType: "Income",
    });

    const entry = await getEntry(userId, (await prisma.driverDailyEarning.findUniqueOrThrow({ where: { incomeId } })).id);
    return serialize(entry as DailyEntry);
  },

  async update(userId: string, id: string, payload: unknown) {
    return this.upsert(userId, { ...(payload as Record<string, unknown>), id });
  },

  async remove(userId: string, id: string) {
    const entry = await prisma.driverDailyEarning.findFirstOrThrow({ where: { id, userId } });
    if (entry.fuelExpenseId) {
      await prisma.transaction.deleteMany({ where: { userId, sourceType: "Expense", sourceId: entry.fuelExpenseId } });
      await prisma.expense.delete({ where: { id: entry.fuelExpenseId, userId } });
    }
    await prisma.transaction.deleteMany({ where: { userId, sourceType: "Income", sourceId: entry.incomeId } });
    await prisma.income.delete({ where: { id: entry.incomeId, userId } });
    return { id };
  },

  formatDifference(entry: { difference: number }) {
    return entry.difference >= 0 ? `Acima da meta em ${entry.difference.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : `Abaixo da meta em ${Math.abs(entry.difference).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
  },

  formatDate(date: Date) {
    return dateLabel(date);
  },
};
