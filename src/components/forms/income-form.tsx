"use client";

import { Button } from "@/components/ui/button";
import { useFinanceForm } from "@/hooks/use-finance-form";
import { incomeSchema } from "@/validators/finance";
import type { z } from "zod";

type SelectOption = {
  id: string;
  name: string;
};

type IncomeFormProps = {
  accounts?: SelectOption[];
  categories?: SelectOption[];
  defaultValues?: Partial<z.input<typeof incomeSchema>>;
  isSubmitting?: boolean;
  onSubmit: (values: z.output<typeof incomeSchema>) => void | Promise<void>;
};

export function IncomeForm({ accounts = [], categories = [], defaultValues, isSubmitting = false, onSubmit }: IncomeFormProps) {
  const form = useFinanceForm<z.input<typeof incomeSchema>, z.output<typeof incomeSchema>>(incomeSchema, defaultValues);

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm font-medium">
        Título
        <input autoFocus className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="Ex.: Salário ou trabalho extra" {...form.register("title")} />
        {form.formState.errors.title ? <span className="text-xs text-destructive">{form.formState.errors.title.message}</span> : null}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Categoria
          <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("categoryId")}>
            <option value="">Selecione</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {form.formState.errors.categoryId ? <span className="text-xs text-destructive">{form.formState.errors.categoryId.message}</span> : null}
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Conta que recebeu
          <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("accountId")}>
            <option value="">Selecione</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          {form.formState.errors.accountId ? <span className="text-xs text-destructive">{form.formState.errors.accountId.message}</span> : null}
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Valor
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="0,00" step="0.01" type="number" {...form.register("amount")} />
          {form.formState.errors.amount ? <span className="text-xs text-destructive">{form.formState.errors.amount.message}</span> : null}
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Data
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" type="date" {...form.register("date")} />
          {form.formState.errors.date ? <span className="text-xs text-destructive">{form.formState.errors.date.message}</span> : null}
        </label>
      </div>

      <details className="rounded-lg border bg-secondary/35 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Mais opções</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input className="size-4 rounded border" type="checkbox" {...form.register("isRecurring")} />
            Repetir automaticamente nos próximos meses
          </label>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" {...form.register("recurrenceFrequency")}>
            <option value="MONTHLY">Mensal</option>
            <option value="BIWEEKLY">Quinzenal</option>
            <option value="WEEKLY">Semanal</option>
            <option value="YEARLY">Anual</option>
          </select>
        </div>
        <div className="mt-3 grid gap-1 text-sm font-medium">
          Situação
          <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("status")}>
            <option value="PENDING">A receber</option>
            <option value="PAID">Recebida</option>
            <option value="OVERDUE">Atrasada</option>
            <option value="CANCELED">Cancelada</option>
          </select>
        </div>
        <label className="mt-3 grid gap-1 text-sm font-medium">
          Observação
          <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm font-normal" placeholder="Observação opcional" {...form.register("description")} />
        </label>
      </details>

      <Button className="mt-2 w-full sm:w-fit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvando..." : "Salvar receita"}
      </Button>
    </form>
  );
}
