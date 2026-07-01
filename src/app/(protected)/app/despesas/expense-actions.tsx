"use client";

import { CheckCircle2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { z } from "zod";

import { ExpenseForm } from "@/components/forms/expense-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
  const defaultValues = useMemo<Partial<z.input<typeof expenseSchema>>>(
    () => ({
      accountId: accounts[0]?.id ?? "",
      amount: 0,
      categoryId: categories[0]?.id ?? "",
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      description: "",
      installments: 1,
      isRecurring: false,
      recurrenceFrequency: "MONTHLY",
      status: "PENDING",
      title: "",
      type: "ONE_TIME",
    }),
    [accounts, categories],
  );
  const isDisabled = accounts.length === 0 || categories.length === 0;

  async function handleSubmit(values: z.output<typeof expenseSchema>) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch("/api/expenses", {
      body: JSON.stringify(values),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel salvar a despesa.");
      return;
    }

    setIsOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {compact ? (
        <Button disabled={isDisabled} onClick={() => setIsOpen((current) => !current)} type="button">
          {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          {isOpen ? "Fechar" : "Adicionar conta futura"}
        </Button>
      ) : (
        <PageHeader
          actions={
            <Button disabled={isDisabled} onClick={() => setIsOpen((current) => !current)} type="button">
              {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
              {isOpen ? "Fechar" : "Nova Despesa"}
            </Button>
          }
          description="Cadastre contas futuras, avulsas, fixas e parceladas."
          eyebrow="Despesas"
          title="Controle visual de compromissos"
        />
      )}
      {isDisabled ? <p className="text-xs text-muted-foreground">Cadastre pelo menos uma conta e uma categoria de despesa.</p> : null}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      {isOpen ? (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <ExpenseForm accounts={accounts} categories={categories} defaultValues={defaultValues} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
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

  async function updateExpense(payload: unknown) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(`/api/expenses/${expense.id}`, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel atualizar.");
      return;
    }

    setIsEditing(false);
    router.refresh();
  }

  async function deleteExpense() {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(`/api/expenses/${expense.id}`, {
      method: "DELETE",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel apagar.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="min-w-56 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="button" variant="outline" onClick={() => setIsEditing((current) => !current)}>
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
          {isEditing ? "Fechar" : "Editar"}
        </Button>
        {expense.status !== "PAID" ? (
          <Button disabled={isSubmitting} size="sm" type="button" onClick={() => updateExpense({ date: new Date().toISOString().slice(0, 10), status: "PAID" })}>
            <CheckCircle2 className="size-4" />
            Pagar
          </Button>
        ) : null}
        <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => setIsConfirmingDelete((current) => !current)}>
          <Trash2 className="size-4" />
          Apagar
        </Button>
      </div>
      {message ? <p className="text-xs text-destructive">{message}</p> : null}
      {isConfirmingDelete ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <p className="font-medium text-destructive">Apagar esta despesa?</p>
          <p className="mt-1 text-muted-foreground">Essa acao remove tambem a movimentacao vinculada.</p>
          <div className="mt-3 flex gap-2">
            <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => setIsConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button disabled={isSubmitting} size="sm" type="button" onClick={deleteExpense}>
              Confirmar
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
