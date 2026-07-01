import { prisma } from "@/lib/prisma";
import { syncOverdueStatuses } from "@/services/overdue-service";

const incomeCategories = ["Salário", "Freelance", "Comissão", "Investimentos", "Outros"];
const expenseCategories = [
  "Alimentação",
  "Transporte",
  "Combustível",
  "Moradia",
  "Internet",
  "Celular",
  "Marketing",
  "Ferramentas",
  "Saúde",
  "Educação",
  "Lazer",
  "Assinaturas",
  "Outros",
];
const accounts = ["Carteira", "Nubank", "PicPay", "Banco do Brasil", "Caixa", "Inter", "Dinheiro"];
const workspaceCache = globalThis as typeof globalThis & {
  moraisWorkspaceEnsuredAt?: Map<string, number>;
};
const WORKSPACE_CACHE_MS = 5 * 60 * 1000;

workspaceCache.moraisWorkspaceEnsuredAt ??= new Map<string, number>();
const ensuredAt = workspaceCache.moraisWorkspaceEnsuredAt;

export async function ensureUserWorkspace(userId: string) {
  const lastRunAt = ensuredAt.get(userId);
  const nowTime = Date.now();

  if (lastRunAt && nowTime - lastRunAt < WORKSPACE_CACHE_MS) {
    return;
  }

  const now = new Date();
  const startsAt = new Date(now.getFullYear(), now.getMonth(), 1);
  const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const year = startsAt.getFullYear();
  const month = startsAt.getMonth() + 1;

  await Promise.all([
    ...incomeCategories.map((name) =>
      prisma.category.upsert({
        where: { userId_type_name: { userId, type: "INCOME", name } },
        update: {},
        create: { userId, name, type: "INCOME", isDefault: true },
      }),
    ),
    ...expenseCategories.map((name) =>
      prisma.category.upsert({
        where: { userId_type_name: { userId, type: "EXPENSE", name } },
        update: {},
        create: { userId, name, type: "EXPENSE", isDefault: true },
      }),
    ),
    ...accounts.map((name, index) =>
      prisma.financialAccount.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: {
          userId,
          name,
          institution: name === "Dinheiro" ? null : name,
          type: name === "Dinheiro" || name === "Carteira" ? "CASH" : "CHECKING",
          isDefault: index === 0,
        },
      }),
    ),
    prisma.month.upsert({
      where: { userId_year_month: { userId, year, month } },
      update: {},
      create: {
        userId,
        year,
        month,
        label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(startsAt),
        startsAt,
        endsAt,
      },
    }),
  ]);

  await syncOverdueStatuses(userId);
  ensuredAt.set(userId, nowTime);
}
