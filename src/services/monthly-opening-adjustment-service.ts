import { prisma } from "@/lib/prisma";
import { monthParamToDate } from "@/lib/month-param";
import { monthlyOpeningAdjustmentSchema } from "@/validators/finance";
import { ensureMonth } from "@/services/transaction-service";

type OpeningAdjustment = {
  id: string;
  monthId: string;
  accountId: string;
  accountName: string;
  amount: number;
  note: string | null;
};

function serialize(adjustment: {
  id: string;
  monthId: string;
  accountId: string;
  amount: { toNumber(): number };
  note: string | null;
  account: { name: string };
}): OpeningAdjustment {
  return {
    id: adjustment.id,
    monthId: adjustment.monthId,
    accountId: adjustment.accountId,
    accountName: adjustment.account.name,
    amount: adjustment.amount.toNumber(),
    note: adjustment.note,
  };
}

export const monthlyOpeningAdjustmentService = {
  async list(userId: string, month: string) {
    const referenceDate = monthParamToDate(month);
    const monthRecord = await ensureMonth(userId, referenceDate);
    const adjustments = await prisma.monthlyOpeningAdjustment.findMany({
      where: { userId, monthId: monthRecord.id },
      include: { account: { select: { name: true } } },
      orderBy: { account: { name: "asc" } },
    });

    return adjustments.map(serialize);
  },

  async upsert(userId: string, payload: unknown) {
    const data = monthlyOpeningAdjustmentSchema.parse(payload);
    const referenceDate = monthParamToDate(data.month);
    const month = await ensureMonth(userId, referenceDate);
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, userId, isArchived: false },
      select: { id: true },
    });

    if (!account) throw new Error("Conta de abertura não encontrada.");

    const adjustment = await prisma.monthlyOpeningAdjustment.upsert({
      where: {
        userId_monthId_accountId: {
          userId,
          monthId: month.id,
          accountId: account.id,
        },
      },
      update: { amount: data.amount, note: data.note ?? null },
      create: {
        userId,
        monthId: month.id,
        accountId: account.id,
        amount: data.amount,
        note: data.note ?? null,
      },
      include: { account: { select: { name: true } } },
    });

    return serialize(adjustment);
  },
};
