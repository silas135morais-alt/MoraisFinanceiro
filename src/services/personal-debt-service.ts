import { prisma } from "@/lib/prisma";
import { personalDebtSchema } from "@/validators/finance";

const priorityRank: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

function isOverdue(dueDate: Date | null, status: string) {
  return status === "OPEN" && Boolean(dueDate && dueDate.getTime() < Date.now());
}

export const personalDebtService = {
  async list(userId: string) {
    const items = await prisma.personalDebt.findMany({
      where: { userId, status: "OPEN" },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    return items.sort((a, b) => {
      const overdueDifference = Number(isOverdue(b.dueDate, b.status)) - Number(isOverdue(a.dueDate, a.status));
      if (overdueDifference !== 0) return overdueDifference;
      const priorityDifference = priorityRank[a.priority] - priorityRank[b.priority];
      if (priorityDifference !== 0) return priorityDifference;
      return (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
    });
  },

  async create(userId: string, payload: unknown) {
    const data = personalDebtSchema.parse(payload);
    return prisma.personalDebt.create({ data: { ...data, userId } });
  },

  async update(userId: string, id: string, payload: unknown) {
    const data = personalDebtSchema.partial().parse(payload);
    const existing = await prisma.personalDebt.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Dívida não encontrada");
    return prisma.personalDebt.update({ where: { id: existing.id }, data });
  },

  async markPaid(userId: string, id: string) {
    const existing = await prisma.personalDebt.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Dívida não encontrada");
    return prisma.personalDebt.update({
      where: { id: existing.id },
      data: { outstandingBalance: 0, status: "PAID" },
    });
  },

  async cancel(userId: string, id: string) {
    const existing = await prisma.personalDebt.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Dívida não encontrada");
    return prisma.personalDebt.update({ where: { id: existing.id }, data: { status: "CANCELED" } });
  },
};

export function serializePersonalDebt(item: {
  id: string;
  creditor: string;
  title: string;
  originalAmount: { toNumber(): number };
  outstandingBalance: { toNumber(): number };
  interestRate: { toNumber(): number };
  dueDate: Date | null;
  priority: string;
  status: string;
  notes: string | null;
}) {
  return {
    id: item.id,
    creditor: item.creditor,
    title: item.title,
    originalAmount: item.originalAmount.toNumber(),
    outstandingBalance: item.outstandingBalance.toNumber(),
    interestRate: item.interestRate.toNumber(),
    dueDate: item.dueDate?.toISOString() ?? null,
    priority: item.priority,
    status: item.status,
    notes: item.notes,
  };
}
