import { auth } from "@/auth";
import { BudgetBoard } from "./budget-board";
import { currency } from "@/lib/format";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { getMonthRange } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";
import { getFinancialDiagnostic } from "@/services/diagnostic-service";
import { categoryService } from "@/services/category-service";
import { ensureMonth } from "@/services/transaction-service";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function BudgetsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id ?? "";
  const params = (await searchParams) ?? {};
  const selectedDate = monthParamToDate(firstParam(params.month));
  const { startsAt, endsAt } = getMonthRange(selectedDate);
  const month = await ensureMonth(userId, selectedDate);
  const [categories, budgets, transactions, diagnostic] = await Promise.all([
    categoryService.list(userId, "EXPENSE"),
    prisma.budget.findMany({ where: { userId, monthId: month.id }, include: { category: true }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({ where: { userId, type: { in: ["EXPENSE", "CREDIT_CARD_PURCHASE"] }, status: { not: "CANCELED" }, OR: [{ dueDate: { gte: startsAt, lte: endsAt } }, { dueDate: null, date: { gte: startsAt, lte: endsAt } }] }, select: { categoryId: true, amount: true } }),
    getFinancialDiagnostic(userId, selectedDate),
  ]);
  const spentByCategory = new Map<string, number>();
  for (const transaction of transactions) if (transaction.categoryId) spentByCategory.set(transaction.categoryId, (spentByCategory.get(transaction.categoryId) ?? 0) + transaction.amount.toNumber());
  const rows = budgets.map((budget) => ({ id: budget.id, categoryId: budget.categoryId, categoryName: budget.category.name, monthId: month.id, limit: budget.limit.toNumber(), alertPercent: budget.alertPercent, planningGroup: budget.planningGroup, spent: spentByCategory.get(budget.categoryId) ?? 0 }));
  const totalLimit = rows.reduce((sum, row) => sum + row.limit, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const profile = diagnostic.driverProfile;
  const grossMonthly = profile.dailyGrossTarget * profile.workDays;
  const plannedNetMonthly = grossMonthly * Math.max(0, 1 - (profile.fuelPercent + profile.maintenancePercent + profile.taxPercent + profile.emergencyPercent) / 100);

  return <div className="space-y-6"><section className="surface-subtle rounded-lg border p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Planejamento personalizado</p><h2 className="mt-2 text-3xl font-semibold">Orçamentos que você escolheu</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Não existe lista obrigatória. Adicione apenas as categorias importantes para o seu planejamento e compare o limite com o consumo real e com a renda líquida planejada.</p><div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-lg bg-card p-4"><p className="text-xs text-muted-foreground">Limites configurados</p><p className="mt-1 text-xl font-semibold">{currency(totalLimit)}</p></div><div className="rounded-lg bg-card p-4"><p className="text-xs text-muted-foreground">Usado no mês</p><p className="mt-1 text-xl font-semibold">{currency(totalSpent)}</p></div><div className="rounded-lg bg-card p-4"><p className="text-xs text-muted-foreground">Categorias planejadas</p><p className="mt-1 text-xl font-semibold">{rows.length}</p></div><div className="rounded-lg bg-card p-4"><p className="text-xs text-muted-foreground">Renda líquida planejada</p><p className="mt-1 text-xl font-semibold">{currency(plannedNetMonthly)}</p></div></div></section><BudgetBoard rows={rows} categories={categories.map((category) => ({ id: category.id, name: category.name }))} monthId={month.id} plannedNetMonthly={plannedNetMonthly} /></div>;
}
