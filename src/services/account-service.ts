import { prisma } from "@/lib/prisma";
import { financeRepository } from "@/repositories/finance-repository";
import { financialAccountSchema } from "@/validators/finance";

export const accountService = {
  list(userId: string) {
    return prisma.financialAccount.findMany({
      where: { userId, isArchived: false },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  },

  async listWithBalances(userId: string, referenceDate?: Date) {
    const [accounts, transactions, openingAdjustments] = await Promise.all([
      prisma.financialAccount.findMany({
        where: { userId, isArchived: false },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          accountId: { not: null },
          status: "PAID",
          type: { in: ["INCOME", "EXPENSE", "INVESTMENT_CONTRIBUTION"] },
        },
        select: { accountId: true, amount: true, type: true },
      }),
      referenceDate
        ? prisma.monthlyOpeningAdjustment.findMany({
            where: {
              userId,
              month: { year: referenceDate.getUTCFullYear(), month: referenceDate.getUTCMonth() + 1 },
            },
            select: { accountId: true, amount: true },
          })
        : Promise.resolve([]),
    ]);

    const openingAdjustmentByAccount = new Map(
      openingAdjustments.map((adjustment) => [adjustment.accountId, adjustment.amount.toNumber()]),
    );

    return accounts.map((account) => {
      const movements = transactions
        .filter((transaction) => transaction.accountId === account.id)
        .reduce((sum, transaction) => {
          const amount = transaction.amount.toNumber();

          return transaction.type === "INCOME" ? sum + amount : sum - amount;
        }, 0);

      const openingAdjustment = openingAdjustmentByAccount.get(account.id) ?? 0;
      const monthlyOpeningBalance = account.initialBalance.toNumber() + openingAdjustment;

      return {
        ...account,
        openingAdjustment,
        monthlyOpeningBalance,
        balance: monthlyOpeningBalance + movements,
      };
    });
  },

  create(userId: string, payload: unknown) {
    const data = financialAccountSchema.parse(payload);
    return prisma.financialAccount.create({ data: { ...data, userId } });
  },

  update(userId: string, id: string, payload: unknown) {
    const data = financialAccountSchema.partial().parse(payload);
    return prisma.financialAccount.update({ where: { id, userId }, data });
  },

  async remove(userId: string, id: string) {
    const usage = await financeRepository.countAccountUsage(userId, id);
    if (usage.some((count) => count > 0)) {
      throw new Error("Conta não pode ser excluída porque possui movimentações vinculadas.");
    }

    return prisma.financialAccount.delete({ where: { id, userId } });
  },
};
