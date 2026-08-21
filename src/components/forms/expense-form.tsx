"use client";

import { Button } from "@/components/ui/button";
import { useFinanceForm } from "@/hooks/use-finance-form";
import { expenseSchema } from "@/validators/finance";
import type { z } from "zod";

type SelectOption = {
  id: string;
  name: string;
};

type ExpenseFormProps = {
  accounts?: SelectOption[];
  categories?: SelectOption[];
  defaultValues?: Partial<z.input<typeof expenseSchema>>;
  isSubmitting?: boolean;
  onSubmit: (values: z.output<typeof expenseSchema>) => void | Promise<void>;
};

export function ExpenseForm({ accounts = [], categories = [], defaultValues, isSubmitting = false, onSubmit }: ExpenseFormProps) {
  const form = useFinanceForm<z.input<typeof expenseSchema>, z.output<typeof expenseSchema>>(expenseSchema, defaultValues);

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm font-medium">
        O que precisa pagar?
        <input autoFocus className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="Ex.: Internet ou parcela da moto" {...form.register("title")} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Categoria
          <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("categoryId")}>
            <option value="">Selecione</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Pagar com
          <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("accountId")}>
            <option value="">Selecione</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          Valor
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="0,00" step="0.01" type="number" {...form.register("amount")} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Data
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" type="date" {...form.register("date")} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Vencimento
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" type="date" {...form.register("dueDate")} />
        </label>
      </div>

      <details className="rounded-lg border bg-secondary/35 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Mais opções</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">
            Tipo
            <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("type")}>
              <option value="ONE_TIME">Avulsa</option>
              <option value="FIXED">Fixa</option>
              <option value="INSTALLMENT">Parcelada</option>
              <option value="SUBSCRIPTION">Assinatura</option>
              <option value="FINANCING">Financiamento</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Parcelas
            <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" min={1} type="number" {...form.register("installments")} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Situação
            <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("status")}>
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="OVERDUE">Atrasada</option>
              <option value="CANCELED">Cancelada</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-3 rounded-lg border bg-background/70 p-3 sm:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input className="size-4 rounded border" type="checkbox" {...form.register("isRecurring")} />
            Repetir automaticamente nos próximos meses
          </label>
          <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("recurrenceFrequency")}>
            <option value="MONTHLY">Mensal</option>
            <option value="BIWEEKLY">Quinzenal</option>
            <option value="WEEKLY">Semanal</option>
            <option value="YEARLY">Anual</option>
          </select>
        </div>
        <label className="mt-3 grid gap-1 text-sm font-medium">
          Observação
          <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm font-normal" placeholder="Observação opcional" {...form.register("description")} />
        </label>
      </details>

      <Button className="mt-2 w-full sm:w-fit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvando..." : "Salvar despesa"}
      </Button>
    </form>
  );
}
