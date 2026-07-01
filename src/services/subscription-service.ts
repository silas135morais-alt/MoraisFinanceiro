import { prisma } from "@/lib/prisma";
import { subscriptionSchema } from "@/validators/finance";

export const subscriptionService = {
  list(userId: string) {
    return prisma.subscription.findMany({
      where: { userId, isActive: true },
      orderBy: { nextChargeAt: "asc" },
    });
  },

  create(userId: string, payload: unknown) {
    const data = subscriptionSchema.parse(payload);
    return prisma.subscription.create({ data: { ...data, userId } });
  },

  update(userId: string, id: string, payload: unknown) {
    const data = subscriptionSchema.partial().parse(payload);
    return prisma.subscription.update({ where: { id, userId }, data });
  },

  remove(userId: string, id: string) {
    return prisma.subscription.update({ where: { id, userId }, data: { isActive: false } });
  },
};
