"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinanceForm } from "@/hooks/use-finance-form";
import { expenseSchema } from "@/validators/finance";
import type { z } from "zod";

type SelectOption = {
  id: string;
  name: string;
};

type RecurrenceFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";

type ExpenseFormProps = {
  accounts?: SelectOption[];
  categories?: SelectOption[];
  defaultValues?: Partial<z.input<typeof expenseSchema>>;
  isSubmitting?: boolean;
  continueAdding?: boolean;
  onSubmit: (values: z.output<typeof expenseSchema>) => void | Promise<void>;
};

export function ExpenseForm({ accounts = [], categories = [], defaultValues, isSubmitting = false, continueAdding = false, onSubmit }: ExpenseFormProps) {
  const form = useFinanceForm<z.input<typeof expenseSchema>, z.output<typeof expenseSchema>>(expenseSchema, defaultValues);
  const recurrenceFrequency = form.watch("recurrenceFrequency") ?? "MONTHLY";
  const isRecurring = form.watch("isRecurring") ?? false;
  const type = form.watch("type") ?? "ONE_TIME";

  function setRecurrence(value: string) {
    if (value === "NONE") {
      form.setValue("isRecurring", false, { shouldDirty: true });
      form.setValue("recurrenceFrequency", "MONTHLY", { shouldDirty: true });
      return;
    }

    form.setValue("isRecurring", true, { shouldDirty: true });
    form.setValue("recurrenceFrequency", value as RecurrenceFrequency, { shouldDirty: true });
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} aria-busy={isSubmitting}>
      <label className="grid gap-1.5 text-sm font-medium">
        O que precisa pagar?
        <input autoFocus className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="Ex.: Internet ou parcela da moto" {...form.register("title")} />
        {form.formState.errors.title ? <span className="text-xs text-destructive">{form.formState.errors.title.message}</span> : null}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Categoria
          <select className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" {...form.register("categoryId")}>
            <option value="">Selecione</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {form.formState.errors.categoryId ? <span className="text-xs text-destructive">{form.formState.errors.categoryId.message}</span> : null}
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          Pagar com
          <select className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" {...form.register("accountId")}>
            <option value="">Selecione</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          {form.formState.errors.accountId ? <span className="text-xs text-destructive">{form.formState.errors.accountId.message}</span> : null}
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Valor
          <input className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="0,00" step="0.01" type="number" {...form.register("amount")} />
          {form.formState.errors.amount ? <span className="text-xs text-destructive">{form.formState.errors.amount.message}</span> : null}
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Data do lançamento
          <input className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" type="date" {...form.register("date")} />
          {form.formState.errors.date ? <span className="text-xs text-destructive">{form.formState.errors.date.message}</span> : null}
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Vencimento
          <input className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" type="date" {...form.register("dueDate")} />
          {form.formState.errors.dueDate ? <span className="text-xs text-destructive">{form.formState.errors.dueDate.message}</span> : null}
        </label>
      </div>

      <div className="grid gap-3 rounded-xl border bg-secondary/25 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Recorrência
          <select className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm" value={isRecurring ? recurrenceFrequency : "NONE"} onChange={(event) => setRecurrence(event.target.value)}>
            <option value="NONE">Não se repete</option>
            <option value="MONTHLY">Mensal</option>
            <option value="BIWEEKLY">Quinzenal</option>
            <option value="WEEKLY">Semanal</option>
            <option value="YEARLY">Anual</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          Situação
          <select className="h-11 rounded-xl border bg-background px-3 py-2 text-sm font-normal shadow-sm" {...form.register("status")}>
            <option value="PENDING">Ainda não paga</option>
            <option value="PAID">Já paga</option>
            <option value="OVERDUE">Atrasada</option>
            <option value="CANCELED">Cancelada</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          Tipo de despesa
          <select className="h-11 rounded-xl border bg-background px-3 py-2 text-sm font-normal shadow-sm" {...form.register("type")}>
            <option value="ONE_TIME">Avulsa</option>
            <option value="FIXED">Fixa</option>
            <option value="SUBSCRIPTION">Assinatura</option>
            <option value="FINANCING">Financiamento</option>
            {type === "INSTALLMENT" ? <option value="INSTALLMENT">Parcelada (registro antigo)</option> : null}
          </select>
          <span className="text-[11px] font-normal text-muted-foreground">Para parcelar uma compra, use o fluxo Compra no cartão.</span>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium">
        Observação
        <textarea className="min-h-20 rounded-xl border bg-background px-3 py-2 text-sm font-normal shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="Alguma informação útil sobre esta despesa" {...form.register("description")} />
      </label>

      {isSubmitting ? <p role="status" className="text-xs text-muted-foreground">Salvando sua despesa...</p> : null}
      <Button className="mt-1 w-full sm:w-fit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvando..." : continueAdding ? <><Check className="size-4" /> Salvar e lançar outro</> : "Salvar despesa"}
      </Button>
    </form>
  );
}
