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
