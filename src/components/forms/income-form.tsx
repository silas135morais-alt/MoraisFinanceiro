"use client";

import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinanceForm } from "@/hooks/use-finance-form";
import { incomeSchema } from "@/validators/finance";
import type { z } from "zod";

type SelectOption = {
  id: string;
  name: string;
};

type RecurrenceFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";

type IncomeFormProps = {
  accounts?: SelectOption[];
  categories?: SelectOption[];
  defaultValues?: Partial<z.input<typeof incomeSchema>>;
  isSubmitting?: boolean;
  continueAdding?: boolean;
  onSubmit: (values: z.output<typeof incomeSchema>) => void | Promise<void>;
};

export function IncomeForm({ accounts = [], categories = [], defaultValues, isSubmitting = false, continueAdding = false, onSubmit }: IncomeFormProps) {
  const form = useFinanceForm<z.input<typeof incomeSchema>, z.output<typeof incomeSchema>>(incomeSchema, defaultValues);
  const recurrenceFrequency = form.watch("recurrenceFrequency") ?? "MONTHLY";
  const isRecurring = form.watch("isRecurring") ?? false;

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
        Título
        <input autoFocus className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="Ex.: Salário ou trabalho extra" {...form.register("title")} />
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
          Conta que recebeu
          <select className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" {...form.register("accountId")}>
            <option value="">Selecione</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          {form.formState.errors.accountId ? <span className="text-xs text-destructive">{form.formState.errors.accountId.message}</span> : null}
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Valor
          <input className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="0,00" step="0.01" type="number" {...form.register("amount")} />
          {form.formState.errors.amount ? <span className="text-xs text-destructive">{form.formState.errors.amount.message}</span> : null}
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          Data
          <input className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" type="date" {...form.register("date")} />
          {form.formState.errors.date ? <span className="text-xs text-destructive">{form.formState.errors.date.message}</span> : null}
        </label>
      </div>

      <div className="grid gap-3 rounded-xl border bg-secondary/25 p-3 sm:grid-cols-2">
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
          <select className="h-11 rounded-xl border bg-background px-3 text-sm font-normal shadow-sm" {...form.register("status")}>
            <option value="PENDING">Ainda não recebida</option>
            <option value="PAID">Já recebida</option>
            <option value="OVERDUE">Atrasada</option>
            <option value="CANCELED">Cancelada</option>
          </select>
        </label>
      </div>

      <details className="group rounded-xl border bg-background/60 px-3 py-2.5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-muted-foreground">
          Observação opcional
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <textarea className="mt-3 min-h-20 w-full rounded-xl border bg-background px-3 py-2 text-sm font-normal shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="Alguma informação útil sobre esta receita" {...form.register("description")} />
      </details>

      {isSubmitting ? <p role="status" className="text-xs text-muted-foreground">Salvando sua receita...</p> : null}
      <Button className="mt-1 w-full sm:w-fit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvando..." : continueAdding ? <><Check className="size-4" /> Salvar e lançar outro</> : "Salvar receita"}
      </Button>
    </form>
  );
}
