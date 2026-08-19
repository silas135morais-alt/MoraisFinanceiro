"use client";

import { Button } from "@/components/ui/button";
import { useFinanceForm } from "@/hooks/use-finance-form";
import { financialAccountSchema } from "@/validators/finance";
import type { z } from "zod";

type AccountFormProps = {
  defaultValues?: Partial<z.input<typeof financialAccountSchema>>;
  isSubmitting?: boolean;
  onSubmit: (values: z.output<typeof financialAccountSchema>) => void | Promise<void>;
};

export function AccountForm({ defaultValues, isSubmitting = false, onSubmit }: AccountFormProps) {
  const form = useFinanceForm<z.input<typeof financialAccountSchema>, z.output<typeof financialAccountSchema>>(financialAccountSchema, defaultValues);

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Nome
          <input autoFocus className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="Ex.: PicPay" {...form.register("name")} />
          {form.formState.errors.name ? <span className="text-xs text-destructive">{form.formState.errors.name.message}</span> : null}
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Instituicao
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="Ex.: Banco, carteira, dinheiro" {...form.register("institution")} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          Tipo
          <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("type")}>
            <option value="CHECKING">Conta corrente</option>
            <option value="SAVINGS">Poupanca</option>
            <option value="WALLET">Carteira</option>
            <option value="CASH">Dinheiro</option>
            <option value="OTHER">Outra</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Cor
          <input className="h-10 rounded-md border bg-background px-2" type="color" {...form.register("color")} />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Saldo inicial
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="0,00" step="0.01" type="number" {...form.register("initialBalance")} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input className="size-4 rounded border" type="checkbox" {...form.register("isDefault")} />
        Conta principal
      </label>

      <Button className="mt-2 w-full sm:w-fit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvando..." : "Salvar conta"}
      </Button>
    </form>
  );
}
