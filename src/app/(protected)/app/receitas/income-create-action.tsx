"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { z } from "zod";

import { IncomeForm } from "@/components/forms/income-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { todayInput } from "@/lib/date-input";
import { prioritizeRecentOptions, readLastPreference, rememberRecentPreference } from "@/lib/recent-preferences";
import { incomeSchema } from "@/validators/finance";

type SelectOption = {
  id: string;
  name: string;
};

type IncomeCreateActionProps = {
  accounts: SelectOption[];
  categories: SelectOption[];
  compact?: boolean;
};

export function IncomeCreateAction({ accounts, categories, compact = false }: IncomeCreateActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastAccountId, setLastAccountId] = useState(() => readLastPreference("morais-financeiro-last-account-v1"));
  const [lastCategoryId, setLastCategoryId] = useState(() => readLastPreference("morais-financeiro-last-income-category-v1"));

  const orderedAccounts = prioritizeRecentOptions(accounts, "morais-financeiro-last-account-v1");
  const orderedCategories = prioritizeRecentOptions(categories, "morais-financeiro-last-income-category-v1");
  const defaultValues = useMemo<Partial<z.input<typeof incomeSchema>>>(
    () => ({
      accountId: orderedAccounts.some((account) => account.id === lastAccountId) ? lastAccountId : orderedAccounts[0]?.id ?? "",
      amount: 0,
      categoryId: orderedCategories.some((category) => category.id === lastCategoryId) ? lastCategoryId : orderedCategories[0]?.id ?? "",
      date: todayInput(),
      description: "",
      isRecurring: false,
      recurrenceFrequency: "MONTHLY",
      status: "PENDING",
      title: "",
    }),
    [orderedAccounts, orderedCategories, lastAccountId, lastCategoryId],
  );

  async function handleSubmit(values: z.output<typeof incomeSchema>) {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/incomes", {
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(body?.error ?? "Não foi possível salvar a receita.");
        return;
      }

      rememberRecentPreference("morais-financeiro-last-account-v1", values.accountId);
      rememberRecentPreference("morais-financeiro-last-income-category-v1", values.categoryId);
      setLastAccountId(values.accountId);
      setLastCategoryId(values.categoryId);
      setMessage("Receita salva com sucesso.");
      setIsOpen(false);
      router.refresh();
    } catch {
      setMessage("Não foi possível concluir agora. Verifique a conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isDisabled = accounts.length === 0 || categories.length === 0;

  return (
    <div className="space-y-3">
      {compact ? (
        <Button disabled={isDisabled} onClick={() => setIsOpen((current) => !current)} type="button">
          {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          {isOpen ? "Fechar" : "Nova receita"}
        </Button>
      ) : (
        <PageHeader
          actions={
            <Button disabled={isDisabled} onClick={() => setIsOpen((current) => !current)} type="button">
              {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
              {isOpen ? "Fechar" : "Nova receita"}
            </Button>
          }
          description="Organize salarios, rendas extras, reembolsos e rendimentos."
          eyebrow="Receitas"
          title="Entradas previstas e recebidas"
        />
      )}

      {isDisabled ? (
        <p className="max-w-sm text-xs text-muted-foreground">
          Cadastre pelo menos uma conta e uma categoria de receita antes de criar lancamentos.
        </p>
      ) : null}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {isOpen ? (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <IncomeForm
            accounts={orderedAccounts}
            categories={orderedCategories}
            defaultValues={defaultValues}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>
      ) : null}
    </div>
  );
}
