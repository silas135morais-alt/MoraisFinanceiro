"use client";

import { CarFront, CreditCard, Plus, Receipt, Wallet, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { z } from "zod";

import { ExpenseForm } from "@/components/forms/expense-form";
import { IncomeForm } from "@/components/forms/income-form";
import { DriverDailyEarningPanel } from "@/app/(protected)/app/diagnostico/driver-daily-earning-panel";
import { todayInput } from "@/lib/date-input";
import { prioritizeRecentOptions, readLastPreference, rememberRecentPreference } from "@/lib/recent-preferences";
import { expenseSchema, incomeSchema } from "@/validators/finance";

type Option = { id: string; name: string };

type QuickAddModalProps = {
  accounts: Option[];
  incomeCategories: Option[];
  expenseCategories: Option[];
  cards: Option[];
};

type QuickMode = "income" | "expense" | "card" | "driver99";
type Selection = { accountId?: string; categoryId?: string; cardId?: string };

const LAST_MODE_KEY = "morais-financeiro-last-quick-mode-v1";
const LAST_ACCOUNT_KEY = "morais-financeiro-last-account-v1";
const LAST_INCOME_CATEGORY_KEY = "morais-financeiro-last-income-category-v1";
const LAST_EXPENSE_CATEGORY_KEY = "morais-financeiro-last-expense-category-v1";
const LAST_CARD_KEY = "morais-financeiro-last-card-v1";

function isQuickMode(value: string): value is QuickMode {
  return value === "income" || value === "expense" || value === "card" || value === "driver99";
}

export function QuickAddModal({ accounts, incomeCategories, expenseCategories, cards }: QuickAddModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<QuickMode>(() => {
    const stored = readLastPreference(LAST_MODE_KEY);
    return isQuickMode(stored) ? stored : "expense";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [continueAdding, setContinueAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [lastAccountId, setLastAccountId] = useState(() => readLastPreference(LAST_ACCOUNT_KEY));
  const [lastIncomeCategoryId, setLastIncomeCategoryId] = useState(() => readLastPreference(LAST_INCOME_CATEGORY_KEY));
  const [lastExpenseCategoryId, setLastExpenseCategoryId] = useState(() => readLastPreference(LAST_EXPENSE_CATEGORY_KEY));
  const [lastCardId, setLastCardId] = useState(() => readLastPreference(LAST_CARD_KEY));
  const today = todayInput();

  function rememberSelection(selection: Selection) {
    if (selection.accountId) {
      rememberRecentPreference(LAST_ACCOUNT_KEY, selection.accountId);
      setLastAccountId(selection.accountId);
    }
    if (selection.categoryId) {
      const categoryKey = mode === "income" ? LAST_INCOME_CATEGORY_KEY : LAST_EXPENSE_CATEGORY_KEY;
      rememberRecentPreference(categoryKey, selection.categoryId);
      if (mode === "income") setLastIncomeCategoryId(selection.categoryId);
      else setLastExpenseCategoryId(selection.categoryId);
    }
    if (selection.cardId) {
      rememberRecentPreference(LAST_CARD_KEY, selection.cardId);
      setLastCardId(selection.cardId);
    }
  }

  function chooseMode(nextMode: QuickMode) {
    setMode(nextMode);
    try {
      window.localStorage.setItem(LAST_MODE_KEY, nextMode);
    } catch {
      // The quick launch flow must remain usable if browser storage is unavailable.
    }
    setMessage(null);
    setError(null);
    setFormKey((current) => current + 1);
  }

  async function submitExpense(values: z.output<typeof expenseSchema>) {
    await submitJson("/api/expenses", values, { accountId: values.accountId, categoryId: values.categoryId });
  }

  async function submitIncome(values: z.output<typeof incomeSchema>) {
    await submitJson("/api/incomes", values, { accountId: values.accountId, categoryId: values.categoryId });
  }

  async function submitJson(endpoint: string, values: unknown, selection: Selection = {}) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Não foi possível salvar o lançamento.");
        return;
      }
      rememberSelection(selection);
      try {
        window.localStorage.setItem(LAST_MODE_KEY, mode);
      } catch {
        // Saving the financial entry must not depend on browser storage.
      }
      if (continueAdding) {
        setFormKey((current) => current + 1);
        setMessage("Salvo. Você pode registrar o próximo.");
      } else {
        setOpen(false);
      }
      router.refresh();
    } catch {
      setError("Não foi possível concluir agora. Verifique a conexão e tente novamente.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
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
    }, { cardId: String(form.get("cardId") ?? ""), categoryId: String(form.get("categoryId") ?? "") });
  }

  function handleDriverSaved(accountId?: string) {
    rememberSelection({ accountId });
    try {
      window.localStorage.setItem(LAST_MODE_KEY, "driver99");
    } catch {
      // The entry was already saved on the server.
    }
    if (!continueAdding) setOpen(false);
  }

  const orderedAccounts = prioritizeRecentOptions(accounts, LAST_ACCOUNT_KEY);
  const orderedIncomeCategories = prioritizeRecentOptions(incomeCategories, LAST_INCOME_CATEGORY_KEY);
  const orderedExpenseCategories = prioritizeRecentOptions(expenseCategories, LAST_EXPENSE_CATEGORY_KEY);
  const orderedCards = prioritizeRecentOptions(cards, LAST_CARD_KEY);
  const preferredAccountId = orderedAccounts.some((account) => account.id === lastAccountId) ? lastAccountId : orderedAccounts[0]?.id ?? "";
  const preferredIncomeCategoryId = orderedIncomeCategories.some((category) => category.id === lastIncomeCategoryId) ? lastIncomeCategoryId : orderedIncomeCategories[0]?.id ?? "";
  const preferredExpenseCategoryId = orderedExpenseCategories.some((category) => category.id === lastExpenseCategoryId) ? lastExpenseCategoryId : orderedExpenseCategories[0]?.id ?? "";
  const preferredCardId = orderedCards.some((card) => card.id === lastCardId) ? lastCardId : orderedCards[0]?.id ?? "";

  return (
    <>
      <button type="button" onClick={() => { setMessage(null); setOpen(true); }} className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
        <Plus className="size-4" /> Novo lançamento
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Novo lançamento">
          <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-xl border bg-card p-5 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Lançamento rápido</p><h2 className="mt-1 text-2xl font-semibold">Registrar movimento</h2></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Fechar"><X className="size-5" /></button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ShortcutButton active={mode === "driver99"} onClick={() => chooseMode("driver99")} icon={<CarFront className="size-4" />}>Ganho da 99</ShortcutButton>
              <ShortcutButton active={mode === "income"} onClick={() => chooseMode("income")} icon={<Wallet className="size-4" />}>Nova receita</ShortcutButton>
              <ShortcutButton active={mode === "expense"} onClick={() => chooseMode("expense")} icon={<Receipt className="size-4" />}>Nova despesa</ShortcutButton>
              <ShortcutButton active={mode === "card"} onClick={() => chooseMode("card")} icon={<CreditCard className="size-4" />}>Compra no cartão</ShortcutButton>
            </div>

            <label className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <input checked={continueAdding} className="size-4 rounded border" onChange={(event) => setContinueAdding(event.target.checked)} type="checkbox" />
              Salvar e lançar outro
            </label>

            {message ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">{message}</p> : null}
            {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <div className="mt-5">
              {mode === "driver99" ? <DriverDailyEarningPanel compact={false} onSaved={handleDriverSaved} preferredAccountId={preferredAccountId} sectionId="ganho-99-quick" /> : null}
              {mode === "income" ? <IncomeForm key={`income-${formKey}`} accounts={orderedAccounts} categories={orderedIncomeCategories} isSubmitting={isSubmitting} defaultValues={{ accountId: preferredAccountId, categoryId: preferredIncomeCategoryId, date: today, status: "PENDING", isRecurring: false, recurrenceFrequency: "MONTHLY" }} onSubmit={submitIncome} /> : null}
              {mode === "expense" ? <ExpenseForm key={`expense-${formKey}`} accounts={orderedAccounts} categories={orderedExpenseCategories} isSubmitting={isSubmitting} defaultValues={{ accountId: preferredAccountId, categoryId: preferredExpenseCategoryId, date: today, dueDate: today, status: "PENDING", type: "ONE_TIME", installments: 1, isRecurring: false, recurrenceFrequency: "MONTHLY" }} onSubmit={submitExpense} /> : null}
              {mode === "card" ? <CardPurchaseForm key={`card-${formKey}`} cards={orderedCards} categories={orderedExpenseCategories} today={today} defaultCardId={preferredCardId} defaultCategoryId={preferredExpenseCategoryId} isSubmitting={isSubmitting} onSubmit={submitCard} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ShortcutButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={active ? "flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm" : "flex items-center justify-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"}>{icon}{children}</button>;
}

function CardPurchaseForm({ cards, categories, today, defaultCardId, defaultCategoryId, isSubmitting, onSubmit }: { cards: Option[]; categories: Option[]; today: string; defaultCardId: string; defaultCategoryId: string; isSubmitting: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  if (!cards.length) return <p className="rounded-lg border bg-secondary/55 p-4 text-sm text-muted-foreground">Cadastre um cartão antes de registrar compras nessa aba.</p>;
  if (!categories.length) return <p className="rounded-lg border bg-secondary/55 p-4 text-sm text-muted-foreground">Cadastre uma categoria de despesa antes de registrar compras no cartão.</p>;

  return     <form className="grid gap-3" onSubmit={onSubmit} aria-busy={isSubmitting}>
      {isSubmitting ? <p role="status" className="text-xs text-muted-foreground">Salvando seu lançamento...</p> : null}
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">Compra<input autoFocus required name="title" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="Ex.: Mercado" /></label><label className="grid gap-1 text-sm font-medium">Cartão<select required name="cardId" defaultValue={defaultCardId} className="h-10 rounded-md border bg-background px-3 text-sm font-normal">{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label></div>
    <div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm font-medium">Categoria<select required name="categoryId" defaultValue={defaultCategoryId} className="h-10 rounded-md border bg-background px-3 text-sm font-normal">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Valor<input required min="0.01" step="0.01" type="number" name="amount" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label><label className="grid gap-1 text-sm font-medium">Data<input required type="date" name="date" defaultValue={today} className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label></div>
    <details className="rounded-lg border bg-secondary/35 p-3"><summary className="cursor-pointer text-sm font-semibold">Mais opções</summary><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm font-medium">Fatura<input type="date" name="invoiceDate" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label><label className="grid gap-1 text-sm font-medium">Parcelas<input min="1" defaultValue="1" type="number" name="installments" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label><label className="grid gap-1 text-sm font-medium">Parcela atual<input min="1" defaultValue="1" type="number" name="currentInstallment" className="h-10 rounded-md border bg-background px-3 text-sm font-normal" /></label></div><textarea name="description" className="mt-3 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Descrição opcional" /></details>
    <p className="text-xs text-muted-foreground">Compras parceladas entram no controle de faturas e no acompanhamento de compromissos.</p>
    <button type="submit" disabled={isSubmitting} className="mt-2 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-fit">{isSubmitting ? "Salvando..." : "Salvar compra"}</button>
  </form>;
}
