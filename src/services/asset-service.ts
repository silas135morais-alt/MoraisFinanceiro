import { prisma } from "@/lib/prisma";
import { assetSchema } from "@/validators/finance";

export const assetService = {
  list(userId: string) {
    return prisma.asset.findMany({
      where: { userId, isArchived: false },
      orderBy: { value: "desc" },
    });
  },

  create(userId: string, payload: unknown) {
    const data = assetSchema.parse(payload);
    return prisma.asset.create({ data: { ...data, userId } });
  },

  update(userId: string, id: string, payload: unknown) {
    const data = assetSchema.partial().parse(payload);
    return prisma.asset.update({ where: { id, userId }, data });
  },

  remove(userId: string, id: string) {
    return prisma.asset.update({ where: { id, userId }, data: { isArchived: true } });
  },
};
