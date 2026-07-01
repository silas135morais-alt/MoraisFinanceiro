"use client";

import { Plus, ShoppingBag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import type { z } from "zod";

import { CreditCardForm } from "@/components/forms/credit-card-form";
import { Button } from "@/components/ui/button";
import { creditCardSchema } from "@/validators/finance";

type SelectOption = {
  id: string;
  name: string;
};

type CardActionsProps = {
  cards: SelectOption[];
  categories: SelectOption[];
};

export function CardActions({ cards, categories }: CardActionsProps) {
  const router = useRouter();
  const [openPanel, setOpenPanel] = useState<"card" | "purchase" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cardDefaults = useMemo<Partial<z.input<typeof creditCardSchema>>>(
    () => ({
      bank: "PicPay",
      brand: "OTHER",
      closingDay: 10,
      color: "#111827",
      dueDay: 15,
      lastFourDigits: "",
      limit: 0,
      name: "",
    }),
    [],
  );

  async function createCard(values: z.output<typeof creditCardSchema>) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch("/api/credit-cards", {
      body: JSON.stringify(values),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel salvar o cartao.");
      return;
    }

    setOpenPanel(null);
    router.refresh();
  }

  async function createPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const invoiceDate = String(form.get("invoiceDate") ?? "");
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/credit-card-purchases", {
      body: JSON.stringify({
        amount: Number(form.get("amount")),
        cardId: String(form.get("cardId")),
        categoryId: String(form.get("categoryId")),
        date: String(form.get("date")),
        description: String(form.get("description") ?? ""),
        ...(invoiceDate ? { invoiceDate } : {}),
        currentInstallment: Number(form.get("currentInstallment") || 1),
        installments: Number(form.get("installments") || 1),
        status: String(form.get("status") || "PENDING"),
        title: String(form.get("title")),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel salvar a compra.");
      return;
    }

    setOpenPanel(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpenPanel(openPanel === "card" ? null : "card")} type="button">
          {openPanel === "card" ? <X className="size-4" /> : <Plus className="size-4" />}
          Novo Cartao
        </Button>
        <Button disabled={cards.length === 0 || categories.length === 0} onClick={() => setOpenPanel(openPanel === "purchase" ? null : "purchase")} type="button" variant="outline">
          {openPanel === "purchase" ? <X className="size-4" /> : <ShoppingBag className="size-4" />}
          Nova Compra
        </Button>
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {openPanel === "card" ? (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <CreditCardForm defaultValues={cardDefaults} isSubmitting={isSubmitting} onSubmit={createCard} />
        </div>
      ) : null}

      {openPanel === "purchase" ? (
        <form className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm" onSubmit={createPurchase}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Compra
              <input autoFocus className="h-10 rounded-md border bg-background px-3 text-sm" name="title" placeholder="Ex.: Mercado" required />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Cartao
              <select className="h-10 rounded-md border bg-background px-3 text-sm" name="cardId" required>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-6">
            <label className="grid gap-1 text-sm font-medium">
              Categoria
              <select className="h-10 rounded-md border bg-background px-3 text-sm" name="categoryId" required>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Valor
              <input className="h-10 rounded-md border bg-background px-3 text-sm" min="0.01" name="amount" required step="0.01" type="number" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Data da compra
              <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={new Date().toISOString().slice(0, 10)} name="date" required type="date" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Fatura
              <input className="h-10 rounded-md border bg-background px-3 text-sm" name="invoiceDate" type="date" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Parcelas
              <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={1} min={1} name="installments" type="number" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Parcela atual
              <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={1} min={1} name="currentInstallment" type="number" />
            </label>
          </div>
          <input name="description" placeholder="Descricao opcional" className="h-10 rounded-md border bg-background px-3 text-sm" />
          <p className="text-xs text-muted-foreground">
            Se a compra ja tem parcelas pagas, informe a fatura atual e o numero da parcela que vence nela. Ex.: fatura em julho e parcela atual 6 marca 1/12 a 5/12 como pagas.
          </p>
          <input name="status" type="hidden" value="PENDING" />
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Salvando..." : "Salvar compra"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
