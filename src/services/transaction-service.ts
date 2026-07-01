import type { Prisma, TransactionStatus, TransactionType } from "@prisma/client";

import { getMonthRange } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

type SyncTransactionInput = {
  userId: string;
  accountId?: string | null;
  categoryId?: string | null;
  type: TransactionType;
  status?: TransactionStatus;
  title: string;
  amount: Prisma.Decimal.Value;
  date: Date;
  dueDate?: Date | null;
  paidAt?: Date | null;
  description?: string | null;
  sourceId: string;
  sourceType: string;
};

export async function ensureMonth(userId: string, date: Date) {
  const { startsAt, endsAt } = getMonthRange(date);
  const year = startsAt.getUTCFullYear();
  const month = startsAt.getUTCMonth() + 1;

  return prisma.month.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: { startsAt, endsAt },
    create: {
      userId,
      year,
      month,
      label: startsAt.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }),
      startsAt,
      endsAt,
    },
  });
}

export async function syncTransaction(input: SyncTransactionInput) {
  const month = await ensureMonth(input.userId, input.date);

  return prisma.transaction.upsert({
    where: {
      userId_sourceType_sourceId: {
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    },
    update: {
      monthId: month.id,
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      status: input.status ?? "PENDING",
      title: input.title,
      amount: input.amount,
      date: input.date,
      dueDate: input.dueDate,
      paidAt: input.paidAt,
      description: input.description,
    },
    create: {
      userId: input.userId,
      monthId: month.id,
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      status: input.status ?? "PENDING",
      title: input.title,
      amount: input.amount,
      date: input.date,
      dueDate: input.dueDate,
      paidAt: input.paidAt,
      description: input.description,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
    },
  });
}
