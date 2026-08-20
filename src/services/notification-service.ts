import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getMonthRange } from "@/lib/date-range";
import { ensureMonth } from "@/services/transaction-service";
import { getFinancialDiagnostic } from "@/services/diagnostic-service";

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

async function notifyOnce(input: Parameters<typeof notify>[0]) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const existing = await prisma.notification.findFirst({
    where: {
      userId: input.userId,
      title: input.title,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (existing) return false;
  await notify(input);
  return true;
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

    const created = await Promise.all(
      dueTomorrow.map((item) => notifyOnce({
        userId,
        type: "WARNING",
        title: `Vencimento amanhã: ${item.title}`,
        message: `${item.title} vence amanhã.`,
        href: "/app/contas-a-pagar",
      })),
    );

    return created.filter(Boolean).length;
  },

  async generateOperationalNotifications(userId: string) {
    const diagnostic = await getFinancialDiagnostic(userId);
    const created: boolean[] = [];

    if (diagnostic.projectedCash30d < 500) {
      created.push(await notifyOnce({
        userId,
        type: "WARNING",
        title: "Caixa projetado abaixo da reserva mínima",
        message: `O caixa projetado em 30 dias é de R$ ${diagnostic.projectedCash30d.toFixed(2)}. Revise compromissos e premissas no Diagnóstico.`,
        href: "/app/diagnostico",
      }));
    }

    const today = new Date();
    const { startsAt, endsAt } = getMonthRange(today);
    const month = await ensureMonth(userId, today);
    const [budgets, transactions] = await Promise.all([
      prisma.budget.findMany({ where: { userId, monthId: month.id }, include: { category: true } }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] },
          status: { not: "CANCELED" },
          OR: [
            { dueDate: { gte: startsAt, lte: endsAt } },
            { dueDate: null, date: { gte: startsAt, lte: endsAt } },
          ],
        },
        select: { categoryId: true, amount: true },
      }),
    ]);
    const spentByCategory = new Map<string, number>();
    for (const transaction of transactions) {
      if (!transaction.categoryId) continue;
      spentByCategory.set(transaction.categoryId, (spentByCategory.get(transaction.categoryId) ?? 0) + transaction.amount.toNumber());
    }
    for (const budget of budgets) {
      const spent = spentByCategory.get(budget.categoryId) ?? 0;
      const ratio = budget.limit.toNumber() > 0 ? spent / budget.limit.toNumber() : 0;
      if (ratio >= budget.alertPercent / 100) {
        created.push(await notifyOnce({
          userId,
          type: "WARNING",
          title: `Orçamento perto do limite: ${budget.category.name}`,
          message: `${budget.category.name} consumiu ${Math.round(ratio * 100)}% do limite mensal.`,
          href: "/app/orcamentos",
        }));
      }
    }

    return created.filter(Boolean).length;
  },
};
