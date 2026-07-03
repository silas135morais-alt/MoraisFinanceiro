import { CreditCard, ReceiptText, WalletCards } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { requireUserId } from "@/lib/auth-guard";
import { getMonthRange } from "@/lib/date-range";
import { currency, shortDate } from "@/lib/format";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { statusLabel } from "@/lib/transaction-status";
import { categoryService } from "@/services/category-service";
import { creditCardService } from "@/services/credit-card-service";

import { CardActions } from "./card-actions";
import { InvoicePayButton } from "./invoice-actions";
import { PurchaseRowActions } from "./purchase-row-actions";

type CartoesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CartoesPage({ searchParams }: CartoesPageProps) {
  const userId = await requireUserId();
  const params = (await searchParams) ?? {};
  const { startsAt, endsAt } = getMonthRange(monthParamToDate(firstParam(params.month)));
  const [cards, purchases, categories] = await Promise.all([
    creditCardService.list(userId, { startDate: startsAt.toISOString(), endDate: endsAt.toISOString() }),
    creditCardService.listPurchases(userId, { pageSize: 50, startDate: startsAt.toISOString(), endDate: endsAt.toISOString() }),
    categoryService.list(userId, "EXPENSE"),
  ]);
  const totalLimit = cards.reduce((sum, card) => sum + Number(card.limit), 0);
  const used = cards.reduce((sum, card) => sum + card.used, 0);
  const invoiceUsed = cards.reduce((sum, card) => sum + card.invoiceUsed, 0);
  const futureUsed = Math.max(used - invoiceUsed, 0);
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cartoes"
        title="Faturas e limites em um so lugar"
        description="Acompanhe a fatura selecionada, parcelas futuras e limite comprometido."
      />
      <CardActions
        cards={cards.map((card) => ({ id: card.id, name: card.name }))}
        categories={categoryOptions}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Limite total" value={currency(totalLimit)} helper={`${currency(totalLimit - used)} disponivel`} icon={WalletCards} tone="blue" />
        <SummaryCard title="Limite comprometido" value={currency(used)} helper={`${currency(totalLimit - used)} disponivel`} icon={ReceiptText} tone="amber" />
        <SummaryCard title="Fatura selecionada" value={currency(invoiceUsed)} helper={`${currency(futureUsed)} em parcelas futuras`} icon={CreditCard} tone="rose" />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.id} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{card.name}</h3>
              <CreditCard className="size-5 text-primary" />
            </div>
            <p className="mt-6 text-2xl font-semibold">{currency(card.invoiceUsed)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Fatura selecionada</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((card.used / Number(card.limit)) * 100, 100)}%` }} />
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>{currency(card.used)} de limite comprometido</p>
              <p>{currency(card.available)} disponivel</p>
            </div>
            <InvoicePayButton
              cardId={card.id}
              disabled={card.invoiceUsed <= 0}
              endDate={endsAt.toISOString()}
              startDate={startsAt.toISOString()}
            />
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Compras da fatura selecionada</h2>
          <p className="text-sm text-muted-foreground">{purchases.total} parcela(s) encontradas no mes escolhido.</p>
        </div>
        <DataTable
          columns={["Compra", "Categoria", "Data da compra", "Fatura", "Parcela", "Valor", "Status", "Acoes"]}
          rows={purchases.items.map((entry) => [
            entry.title,
            entry.category.name,
            shortDate(entry.date),
            shortDate(entry.invoiceDueDate),
            entry.installments > 1 ? `${entry.installmentNumber ?? 1}/${entry.installments}` : "-",
            currency(Number(entry.amount)),
            statusLabel(entry.status),
            <PurchaseRowActions
              key={entry.id}
              categories={categoryOptions}
              purchase={{
                id: entry.id,
                amount: Number(entry.amount),
                categoryId: entry.categoryId,
                date: entry.date.toISOString().slice(0, 10),
                description: entry.description ?? "",
                invoiceDate: entry.invoiceDueDate ? entry.invoiceDueDate.toISOString().slice(0, 10) : "",
                installmentNumber: entry.installmentNumber,
                installments: entry.installments,
                status: entry.status,
                title: entry.title,
              }}
            />,
          ])}
        />
      </section>
    </div>
  );
}
