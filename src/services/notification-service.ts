import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function notify(input: {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  href?: string;
}) {
  return prisma.notification.create({
    data: {
      type: "INFO",
      ...input,
    },
  });
}

export const notificationService = {
  list(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  markAsRead(userId: string, id: string) {
    return prisma.notification.update({ where: { id, userId }, data: { readAt: new Date() } });
  },

  async generateDueNotifications(userId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);

    const dueTomorrow = await prisma.transaction.findMany({
      where: { userId, status: "PENDING", dueDate: { gte: start, lte: end } },
      take: 10,
    });

    await Promise.all(
      dueTomorrow.map((item) =>
        notify({
          userId,
          type: "WARNING",
          title: "Vencimento amanhã",
          message: `${item.title} vence amanhã.`,
          href: "/app/contas-a-pagar",
        }),
      ),
    );

    return dueTomorrow.length;
  },
};
