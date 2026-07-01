import { prisma } from "@/lib/prisma";
import { financeRepository } from "@/repositories/finance-repository";
import { categorySchema } from "@/validators/finance";

export const categoryService = {
  list(userId: string, type?: "INCOME" | "EXPENSE" | "INVESTMENT") {
    return financeRepository.listCategories(userId, type);
  },

  create(userId: string, payload: unknown) {
    const data = categorySchema.parse(payload);
    return prisma.category.create({ data: { ...data, userId } });
  },

  update(userId: string, id: string, payload: unknown) {
    const data = categorySchema.partial().parse(payload);
    return prisma.category.update({ where: { id, userId }, data });
  },

  async remove(userId: string, id: string) {
    const usage = await financeRepository.countCategoryUsage(userId, id);
    if (usage.some((count) => count > 0)) {
      throw new Error("Categoria não pode ser excluída porque possui lançamentos vinculados.");
    }

    return prisma.category.delete({ where: { id, userId } });
  },
};
