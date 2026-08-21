"use client";

import { CheckCircle2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { z } from "zod";

import { ExpenseForm } from "@/components/forms/expense-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { todayInput } from "@/lib/date-input";
import { prioritizeRecentOptions, readLastPreference, rememberRecentPreference } from "@/lib/recent-preferences";
import { expenseSchema } from "@/validators/finance";

type SelectOption = {
  id: string;
  name: string;
};

type ExpenseItem = {
  id: string;
  accountId: string;
  amount: number;
  categoryId: string;
  date: string;
  description: string;
  dueDate: string;
  installments?: number;
  status: "PAID" | "PENDING" | "OVERDUE" | "CANCELED";
  title: string;
  type: "ONE_TIME" | "FIXED" | "INSTALLMENT" | "SUBSCRIPTION" | "FINANCING";
};

type SharedProps = {
  accounts: SelectOption[];
  categories: SelectOption[];
};

type ExpenseCreateActionProps = SharedProps & {
  compact?: boolean;
};

export function ExpenseCreateAction({ accounts, categories, compact = false }: ExpenseCreateActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastAccountId, setLastAccountId] = useState(() => readLastPreference("morais-financeiro-last-account-v1"));
  const [lastCategoryId, setLastCategoryId] = useState(() => readLastPreference("morais-financeiro-last-expense-category-v1"));
  const orderedAccounts = prioritizeRecentOptions(accounts, "morais-financeiro-last-account-v1");
  const orderedCategories = prioritizeRecentOptions(categories, "morais-financeiro-last-expense-category-v1");
  const defaultValues = useMemo<Partial<z.input<typeof expenseSchema>>>(
    () => ({
      accountId: orderedAccounts.some((account) => account.id === lastAccountId) ? lastAccountId : orderedAccounts[0]?.id ?? "",
      amount: 0,
      categoryId: orderedCategories.some((category) => category.id === lastCategoryId) ? lastCategoryId : orderedCategories[0]?.id ?? "",
      date: todayInput(),
      dueDate: todayInput(),
      description: "",
      installments: 1,
      isRecurring: false,
      recurrenceFrequency: "MONTHLY",
      status: "PENDING",
      title: "",
      type: "ONE_TIME",
    }),
    [orderedAccounts, orderedCategories, lastAccountId, lastCategoryId],
  );
  const isDisabled = accounts.length === 0 || categories.length === 0;

  async function handleSubmit(values: z.output<typeof expenseSchema>) {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/expenses", {
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(body?.error ?? "Não foi possível salvar a despesa. Tente novamente.");
        return;
      }

      rememberRecentPreference("morais-financeiro-last-account-v1", values.accountId);
      rememberRecentPreference("morais-financeiro-last-expense-category-v1", values.categoryId);
      setLastAccountId(values.accountId);
      setLastCategoryId(values.categoryId);
      setMessage("Despesa salva com sucesso.");
      setIsOpen(false);
      router.refresh();
    } catch {
      setMessage("Não foi possível concluir agora. Verifique a conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {compact ? (
        <Button disabled={isDisabled} onClick={() => setIsOpen((current) => !current)} type="button">
          {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          {isOpen ? "Fechar" : "Nova despesa"}
        </Button>
      ) : (
        <PageHeader
          actions={
            <Button disabled={isDisabled} onClick={() => setIsOpen((current) => !current)} type="button">
              {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
              {isOpen ? "Fechar" : "Nova despesa"}
            </Button>
          }
          description="Cadastre contas futuras, avulsas, fixas e parceladas."
          eyebrow="Despesas"
          title="Controle visual de compromissos"
        />
      )}
      {isDisabled ? <p className="text-xs text-muted-foreground">Cadastre pelo menos uma conta e uma categoria de despesa.</p> : null}
      {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
      {isOpen ? (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <ExpenseForm accounts={orderedAccounts} categories={orderedCategories} defaultValues={defaultValues} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
        </div>
      ) : null}
    </div>
  );
}

export function ExpenseRowActions({ accounts, categories, expense }: SharedProps & { expense: ExpenseItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => Promise<void>) | null>(null);

  async function updateExpense(payload: unknown) {
    setIsSubmitting(true);
    setMessage(null);
    setRetryAction(null);
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(body?.error ?? "Não foi possível atualizar.");
        setRetryAction(() => () => updateExpense(payload));
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch {
      setMessage("Não foi possível concluir agora. Verifique a conexão.");
      setRetryAction(() => () => updateExpense(payload));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteExpense() {
    setIsSubmitting(true);
    setMessage(null);
    setRetryAction(null);
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(body?.error ?? "Não foi possível apagar.");
        setRetryAction(() => () => deleteExpense());
        return;
      }

      router.refresh();
    } catch {
      setMessage("Não foi possível concluir agora. Verifique a conexão.");
      setRetryAction(() => () => deleteExpense());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-w-56 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="button" variant="outline" onClick={() => setIsEditing((current) => !current)}>
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
          {isEditing ? "Fechar" : "Corrigir"}
        </Button>
        {expense.status !== "PAID" ? (
          <Button disabled={isSubmitting} size="sm" type="button" onClick={() => void updateExpense({ date: todayInput(), status: "PAID" })}>
            <CheckCircle2 className="size-4" />
            {isSubmitting ? "Salvando..." : "Pagar"}
          </Button>
        ) : null}
        <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => setIsConfirmingDelete((current) => !current)}>
          <Trash2 className="size-4" />
          Apagar
        </Button>
      </div>
      {message ? <div className="flex flex-wrap items-center gap-2 text-xs text-destructive" role="alert"><p>{message}</p>{retryAction ? <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => void retryAction()}><RefreshCw className="size-3.5" />Tentar novamente</Button> : null}</div> : null}
      {isConfirmingDelete ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <p className="font-medium text-destructive">Apagar esta despesa?</p>
          <p className="mt-1 text-muted-foreground">Essa ação remove também a movimentação vinculada.</p>
          <div className="mt-3 flex gap-2">
            <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => setIsConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button disabled={isSubmitting} size="sm" type="button" onClick={() => void deleteExpense()}>
              {isSubmitting ? "Apagando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      ) : null}
      {isEditing ? (
        <div className="rounded-lg border bg-background p-3">
          <ExpenseForm accounts={accounts} categories={categories} defaultValues={expense} isSubmitting={isSubmitting} onSubmit={updateExpense} />
        </div>
      ) : null}
    </div>
  );
}
