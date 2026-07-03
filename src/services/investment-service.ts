import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { syncTransaction } from "@/services/transaction-service";
import { investmentContributionSchema, investmentSchema } from "@/validators/finance";

const redemptionSchema = z.object({
  amount: z.coerce.number().positive(),
  date: z.string().min(1).transform((value) => new Date(value)),
  description: z.string().optional().nullable(),
});

export const investmentService = {
  async list(userId: string) {
    const investments = await prisma.investment.findMany({
      where: { userId, isArchived: false },
      include: { contributions: true },
      orderBy: { name: "asc" },
    });

    return investments.map((investment) => {
      const contributionTotal = investment.contributions.reduce((sum, contribution) => sum + contribution.amount.toNumber(), 0);
      const currentValue = Math.max(investment.currentValue.toNumber(), contributionTotal);

      return { ...investment, currentValue: new Prisma.Decimal(currentValue) };
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

  async redeem(userId: string, id: string, payload: unknown) {
    const data = redemptionSchema.parse(payload);
    const investment = await prisma.investment.findUniqueOrThrow({ where: { id, userId } });
    const currentValue = investment.currentValue.toNumber();

    if (data.amount > currentValue) {
      throw new Error("Valor de resgate maior que o saldo do investimento.");
    }

    await prisma.investment.update({
      where: { id, userId },
      data: { currentValue: { decrement: data.amount } },
    });

    return syncTransaction({
      userId,
      type: "INCOME",
      status: "PAID",
      title: `Resgate de ${investment.name}`,
      amount: data.amount,
      date: data.date,
      paidAt: data.date,
      description: data.description,
      sourceId: randomUUID(),
      sourceType: "InvestmentRedemption",
    });
  },

  async createContribution(userId: string, payload: unknown) {
    const data = investmentContributionSchema.parse(payload);
    const contribution = await prisma.$transaction(async (tx) => {
      const created = await tx.investmentContribution.create({ data: { ...data, userId } });
      await tx.investment.update({
        where: { id: data.investmentId, userId },
        data: { currentValue: { increment: data.amount } },
      });

      return created;
    });
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
