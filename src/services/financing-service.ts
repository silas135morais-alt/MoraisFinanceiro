import { prisma } from "@/lib/prisma";
import { financingSchema } from "@/validators/finance";

export const financingService = {
  list(userId: string) {
    return prisma.financing.findMany({
      where: { userId, isActive: true },
      orderBy: { nextDueDate: "asc" },
    });
  },

  create(userId: string, payload: unknown) {
    const data = financingSchema.parse(payload);
    return prisma.financing.create({ data: { ...data, userId } });
  },

  update(userId: string, id: string, payload: unknown) {
    const data = financingSchema.partial().parse(payload);
    return prisma.financing.update({ where: { id, userId }, data });
  },

  remove(userId: string, id: string) {
    return prisma.financing.update({ where: { id, userId }, data: { isActive: false } });
  },
};
