import { prisma } from "@/lib/prisma";
import { syncTransaction } from "@/services/transaction-service";
import { investmentContributionSchema, investmentSchema } from "@/validators/finance";

export const investmentService = {
  list(userId: string) {
    return prisma.investment.findMany({
      where: { userId, isArchived: false },
      include: { contributions: true },
      orderBy: { name: "asc" },
    });
  },

  create(userId: string, payload: unknown) {
    const data = investmentSchema.parse(payload);
    return prisma.investment.create({ data: { ...data, userId } });
  },

  update(userId: string, id: string, payload: unknown) {
    const data = investmentSchema.partial().parse(payload);
    return prisma.investment.update({ where: { id, userId }, data });
  },

  remove(userId: string, id: string) {
    return prisma.investment.update({ where: { id, userId }, data: { isArchived: true } });
  },

  async createContribution(userId: string, payload: unknown) {
    const data = investmentContributionSchema.parse(payload);
    const contribution = await prisma.investmentContribution.create({ data: { ...data, userId } });
    const transaction = await syncTransaction({
      userId,
      categoryId: contribution.categoryId,
      type: "INVESTMENT_CONTRIBUTION",
      status: "PAID",
      title: "Aporte em investimento",
      amount: contribution.amount,
      date: contribution.date,
      description: contribution.description,
      sourceId: contribution.id,
      sourceType: "InvestmentContribution",
    });
    return prisma.investmentContribution.update({
      where: { id: contribution.id, userId },
      data: { transactionId: transaction.id },
    });
  },
};
