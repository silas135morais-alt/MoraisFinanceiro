import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/validators/finance";

export const budgetService = {
  list(userId: string) {
    return prisma.budget.findMany({
      where: { userId },
      include: { category: true, month: true },
      orderBy: { createdAt: "desc" },
    });
  },

  create(userId: string, payload: unknown) {
    const data = budgetSchema.parse(payload);
    return prisma.budget.create({ data: { ...data, userId } });
  },

  update(userId: string, id: string, payload: unknown) {
    const data = budgetSchema.partial().parse(payload);
    return prisma.budget.update({ where: { id, userId }, data });
  },

  remove(userId: string, id: string) {
    return prisma.budget.delete({ where: { id, userId } });
  },
};
