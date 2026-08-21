"use client";

import Link from "next/link";
import { CheckCircle2, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { IncomeForm } from "@/components/forms/income-form";
import { Button } from "@/components/ui/button";

type SelectOption = {
  id: string;
  name: string;
};

type IncomeItem = {
  id: string;
  accountId: string;
  amount: number;
  categoryId: string;
  date: string;
  description: string;
  isRecurring: boolean;
  status: "PAID" | "PENDING" | "OVERDUE" | "CANCELED";
  title: string;
  driverDailyEarningId?: string;
};

type IncomeRowActionsProps = {
  accounts: SelectOption[];
  categories: SelectOption[];
  income: IncomeItem;
};

export function IncomeRowActions({ accounts, categories, income }: IncomeRowActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isDriverDailyEarning = Boolean(income.driverDailyEarningId);

  async function updateIncome(payload: unknown) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(`/api/incomes/${income.id}`, {
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

  async function deleteIncome() {
    setIsSubmitting(true);
    setMessage(null);
    const endpoint = isDriverDailyEarning ? `/api/motorista-99/realizado/${income.driverDailyEarningId}` : `/api/incomes/${income.id}`;
    const response = await fetch(endpoint, { method: "DELETE" });
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
        {isDriverDailyEarning ? (
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            href={`/app/receitas?edit99=${income.driverDailyEarningId}#ganho-99`}
          >
            <Pencil className="size-4" />
            Corrigir ganho
          </Link>
        ) : (
          <Button size="sm" type="button" variant="outline" onClick={() => setIsEditing((current) => !current)}>
            {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
            {isEditing ? "Fechar" : "Corrigir"}
          </Button>
        )}

        {!isDriverDailyEarning && income.status !== "PAID" ? (
          <Button
            disabled={isSubmitting}
            size="sm"
            type="button"
            onClick={() => updateIncome({ date: new Date().toISOString().slice(0, 10), status: "PAID" })}
          >
            <CheckCircle2 className="size-4" />
            Receber
          </Button>
        ) : null}

        <Button
          disabled={isSubmitting}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => setIsConfirmingDelete((current) => !current)}
        >
          <Trash2 className="size-4" />
          Apagar
        </Button>
      </div>

      {message ? <p className="text-xs text-destructive">{message}</p> : null}

      {isConfirmingDelete ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <p className="font-medium text-destructive">Apagar esta receita?</p>
          <p className="mt-1 text-muted-foreground">{isDriverDailyEarning ? "Essa ação remove também o realizado diário e a movimentação vinculada." : "Essa ação remove também a movimentação vinculada."}</p>
          <div className="mt-3 flex gap-2">
            <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => setIsConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button disabled={isSubmitting} size="sm" type="button" onClick={deleteIncome}>
              Confirmar
            </Button>
          </div>
        </div>
      ) : null}

      {isEditing && !isDriverDailyEarning ? (
        <div className="rounded-lg border bg-background p-3">
          <IncomeForm
            accounts={accounts}
            categories={categories}
            defaultValues={income}
            isSubmitting={isSubmitting}
            onSubmit={updateIncome}
          />
        </div>
      ) : null}
    </div>
  );
}
