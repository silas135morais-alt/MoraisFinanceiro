import { prisma } from "@/lib/prisma";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function syncOverdueStatuses(userId: string) {
  const today = startOfToday();
  const futureOrTodayDate = {
    OR: [
      { dueDate: { gte: today } },
      { dueDate: null, date: { gte: today } },
    ],
  };
  const pastDate = {
    OR: [
      { dueDate: { lt: today } },
      { dueDate: null, date: { lt: today } },
    ],
  };

  await Promise.all([
    prisma.transaction.updateMany({
      where: {
        userId,
        status: "PENDING",
        ...pastDate,
      },
      data: { status: "OVERDUE" },
    }),
    prisma.transaction.updateMany({
      where: {
        userId,
        sourceType: "Expense",
        status: "OVERDUE",
        ...futureOrTodayDate,
      },
      data: { status: "PENDING" },
    }),
    prisma.expense.updateMany({
      where: {
        userId,
        status: "PENDING",
        ...pastDate,
      },
      data: { status: "OVERDUE" },
    }),
    prisma.expense.updateMany({
      where: {
        userId,
        status: "OVERDUE",
        ...futureOrTodayDate,
      },
      data: { status: "PENDING" },
    }),
    prisma.income.updateMany({
      where: {
        userId,
        status: "PENDING",
        date: { lt: today },
      },
      data: { status: "OVERDUE" },
    }),
  ]);
}
