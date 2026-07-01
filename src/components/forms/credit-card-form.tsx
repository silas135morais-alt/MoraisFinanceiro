"use client";

import { Button } from "@/components/ui/button";
import { useFinanceForm } from "@/hooks/use-finance-form";
import { creditCardSchema } from "@/validators/finance";
import type { z } from "zod";

type CreditCardFormProps = {
  defaultValues?: Partial<z.input<typeof creditCardSchema>>;
  isSubmitting?: boolean;
  onSubmit: (values: z.output<typeof creditCardSchema>) => void | Promise<void>;
};

export function CreditCardForm({ defaultValues, isSubmitting = false, onSubmit }: CreditCardFormProps) {
  const form = useFinanceForm<z.input<typeof creditCardSchema>, z.output<typeof creditCardSchema>>(creditCardSchema, defaultValues);

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Banco
          <input autoFocus className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="Ex.: PicPay" {...form.register("bank")} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Nome do cartao
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="Ex.: PicPay Black" {...form.register("name")} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          Limite
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" placeholder="0,00" step="0.01" type="number" {...form.register("limit")} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Fechamento
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" max={31} min={1} type="number" {...form.register("closingDay")} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Vencimento
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" max={31} min={1} type="number" {...form.register("dueDay")} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium">
          Bandeira
          <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" {...form.register("brand")}>
            <option value="VISA">Visa</option>
            <option value="MASTERCARD">Mastercard</option>
            <option value="ELO">Elo</option>
            <option value="AMEX">Amex</option>
            <option value="HIPERCARD">Hipercard</option>
            <option value="OTHER">Outra</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Ultimos 4 digitos
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" maxLength={4} placeholder="0000" {...form.register("lastFourDigits")} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Cor
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" type="color" {...form.register("color")} />
        </label>
      </div>

      <Button className="mt-2 w-full sm:w-fit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvando..." : "Salvar cartao"}
      </Button>
    </form>
  );
}
