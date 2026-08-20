"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CreditCard, Plus, Receipt, Wallet, X } from "lucide-react";

import { ExpenseForm } from "@/components/forms/expense-form";
import { IncomeForm } from "@/components/forms/income-form";
import type { z } from "zod";
import { expenseSchema, incomeSchema } from "@/validators/finance";

type Option = { id: string; name: string };

type QuickAddModalProps = {
  accounts: Option[];
  incomeCategories: Option[];
  expenseCategories: Option[];
  cards: Option[];
};

type Tab = "income" | "expense" | "card";

export function QuickAddModal({ accounts, incomeCategories, expenseCategories, cards }: QuickAddModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("expense");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function submitExpense(values: z.output<typeof expenseSchema>) {
    await submitJson("/api/expenses", values);
  }

  async function submitIncome(values: z.output<typeof incomeSchema>) {
    await submitJson("/api/incomes", values);
  }

  async function submitJson(endpoint: string, values: unknown) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    setIsSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Não foi possível salvar o lançamento.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function submitCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submitJson("/api/credit-card-purchases", {
      title: String(form.get("title") ?? ""),
      cardId: String(form.get("cardId") ?? ""),
      categoryId: String(form.get("categoryId") ?? ""),
      amount: Number(form.get("amount") ?? 0),
      date: String(form.get("date") ?? today),
      invoiceDate: String(form.get("invoiceDate") ?? "") || undefined,
      installments: Number(form.get("installments") || 1),
      currentInstallment: Number(form.get("currentInstallment") || 1),
      description: String(form.get("description") ?? ""),
      status: "PENDING",
    });
  }

  return (
    <>
      <button type="button" onClick={() => { setMessage(null); setOpen(true); }} className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
        <Plus className="size-4" /> Novo lançamento
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Novo lançamento">
          <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-xl border bg-card p-5 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Lançamento rápido</p><h2 className="mt-1 text-2xl font-semibold">Registrar movimento</h2></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Fechar"><X className="size-5" /></button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-secondary/55 p-1">
              <TabButton active={tab === "income"} onClick={() => setTab("income")} icon={<Wallet className="size-4" />}>Receita</TabButton>
              <TabButton active={tab === "expense"} onClick={() => setTab("expense")} icon={<Receipt className="size-4" />}>Despesa</TabButton>
              <TabButton active={tab === "card"} onClick={() => setTab("card")} icon={<CreditCard className="size-4" />}>Cartão</TabButton>
            </div>
            {message ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{message}</p> : null}
            <div className="mt-5">
              {tab === "income" ? <IncomeForm accounts={accounts} categories={incomeCategories} isSubmitting={isSubmitting} defaultValues={{ date: today, status: "PENDING", isRecurring: false, recurrenceFrequency: "MONTHLY" }} onSubmit={submitIncome} /> : null}
              {tab === "expense" ? <ExpenseForm accounts={accounts} categories={expenseCategories} isSubmitting={isSubmitting} defaultValues={{ date: today, dueDate: today, status: "PENDING", type: "ONE_TIME", installments: 1, isRecurring: false, recurrenceFrequency: "MONTHLY" }} onSubmit={submitExpense} /> : null}
              {tab === "card" ? <CardPurchaseForm cards={cards} categories={expenseCategories} today={today} isSubmitting={isSubmitting} onSubmit={submitCard} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={active ? "flex items-center justify-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-semibold text-primary shadow-sm" : "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"}>{icon}{children}</button>;
}

function CardPurchaseForm({ cards, categories, today, isSubmitting, onSubmit }: { cards: Option[]; categories: Option[]; today: string; isSubmitting: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  if (!cards.length) return <p className="rounded-lg border bg-secondary/55 p-4 text-sm text-muted-foreground">Cadastre um cartão antes de registrar compras nessa aba.</p>;
  if (!categories.length) return <p className="rounded-lg border bg-secondary/55 p-4 text-sm text-muted-foreground">Cadastre uma categoria de despesa antes de registrar compras no cartão.</p>;

  return <form className="grid gap-3" onSubmit={onSubmit}>
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">Compra<input autoFocus required name="title" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="Ex.: Mercado" /></label><label className="grid gap-1 text-sm font-medium">Cartão<select required name="cardId" className="h-10 rounded-md border bg-background px-3 text-sm font-normal">{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label></div>
    <div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm font-medium">Categoria<select required name="categoryId" className="h-10 rounded-md border bg-background px-3 text-sm font-normal">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Valor<input required min="0.01" step="0.01" type="number" name="amount" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label><label className="grid gap-1 text-sm font-medium">Data<input required type="date" name="date" defaultValue={today} className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label></div>
    <div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm font-medium">Fatura<input type="date" name="invoiceDate" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label><label className="grid gap-1 text-sm font-medium">Parcelas<input min="1" defaultValue="1" type="number" name="installments" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label><label className="grid gap-1 text-sm font-medium">Parcela atual<input min="1" defaultValue="1" type="number" name="currentInstallment" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label></div>
    <textarea name="description" className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" placeholder="Descrição opcional" />
    <p className="text-xs text-muted-foreground">Compras parceladas entram no controle de faturas e no acompanhamento de compromissos.</p>
    <button type="submit" disabled={isSubmitting} className="mt-2 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-fit">{isSubmitting ? "Salvando..." : "Salvar compra"}</button>
  </form>;
}
