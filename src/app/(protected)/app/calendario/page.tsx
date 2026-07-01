import { CalendarDays } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { requireUserId } from "@/lib/auth-guard";
import { currency } from "@/lib/format";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { prisma } from "@/lib/prisma";

const days = Array.from({ length: 35 }, (_, index) => index + 1);

type CalendarioPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CalendarioPage({ searchParams }: CalendarioPageProps) {
  const userId = await requireUserId();
  const params = (await searchParams) ?? {};
  const now = monthParamToDate(firstParam(params.month));
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const [transactions, subscriptions, financings, contributions] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, OR: [{ date: { gte: start, lte: end } }, { dueDate: { gte: start, lte: end } }] },
      orderBy: { date: "asc" },
    }),
    prisma.subscription.findMany({ where: { userId, nextChargeAt: { gte: start, lte: end }, isActive: true } }),
    prisma.financing.findMany({ where: { userId, nextDueDate: { gte: start, lte: end }, isActive: true } }),
    prisma.investmentContribution.findMany({ where: { userId, date: { gte: start, lte: end } } }),
  ]);
  const events = [
    ...transactions.map((item) => ({ day: (item.dueDate ?? item.date).getDate(), title: item.title, amount: currency(Number(item.amount)) })),
    ...subscriptions.map((item) => ({ day: item.nextChargeAt.getDate(), title: item.name, amount: currency(Number(item.amount)) })),
    ...financings.map((item) => ({ day: item.nextDueDate.getDate(), title: item.name, amount: currency(Number(item.installmentAmount)) })),
    ...contributions.map((item) => ({ day: item.date.getDate(), title: "Aporte", amount: currency(Number(item.amount)) })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendário"
        title="Calendário financeiro mensal"
        description="Vencimentos, recebimentos, parcelas, cartões, assinaturas e investimentos."
      />
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = events.filter((event) => event.day === day).slice(0, 2);
            return (
              <div key={day} className="min-h-24 rounded-lg border bg-background p-2">
                <span className="text-sm font-medium">{day <= end.getDate() ? day : ""}</span>
                {day <= end.getDate() && dayEvents.map((event) => (
                  <div key={`${event.title}-${event.amount}`} className="mt-2 rounded-md bg-primary/10 p-2 text-left">
                    <p className="truncate text-xs font-medium text-primary">{event.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{event.amount}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
      <div className="flex items-center gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <CalendarDays className="size-4 text-primary" />
        Eventos reais do mês atual conectados ao banco.
      </div>
    </div>
  );
}
