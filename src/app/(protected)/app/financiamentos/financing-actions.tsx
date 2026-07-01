"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type SelectOption = {
  id: string;
  name: string;
};

type FinancingActionsProps = {
  accounts: SelectOption[];
  categories: SelectOption[];
};

export function FinancingActions({ accounts, categories }: FinancingActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isDisabled = accounts.length === 0 || categories.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const financedAmount = Number(form.get("financedAmount"));
    const installments = Number(form.get("installments"));
    const installmentAmount = Number(form.get("installmentAmount")) || financedAmount / Math.max(installments, 1);

    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch("/api/financings", {
      body: JSON.stringify({
        accountId: String(form.get("accountId")),
        categoryId: String(form.get("categoryId")),
        currentInstallment: Number(form.get("currentInstallment") || 1),
        financedAmount,
        installmentAmount,
        installments,
        interestRate: Number(form.get("interestRate") || 0),
        name: String(form.get("name")),
        nextDueDate: String(form.get("nextDueDate")),
        outstandingBalance: Number(form.get("outstandingBalance") || financedAmount),
        status: String(form.get("status")),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel salvar o financiamento.");
      return;
    }

    setIsOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button disabled={isDisabled} onClick={() => setIsOpen((current) => !current)} type="button">
        {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
        {isOpen ? "Fechar" : "Novo Financiamento"}
      </Button>

      {isDisabled ? <p className="text-xs text-muted-foreground">Cadastre uma conta e uma categoria de despesa antes de criar financiamentos.</p> : null}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {isOpen ? (
        <form className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm" onSubmit={handleSubmit}>
          <input autoFocus className="h-10 rounded-md border bg-background px-3 text-sm" name="name" placeholder="Nome do financiamento" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" name="categoryId" required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" name="accountId" required>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <input className="h-10 rounded-md border bg-background px-3 text-sm" name="financedAmount" placeholder="Valor financiado" required step="0.01" type="number" />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" name="outstandingBalance" placeholder="Saldo devedor" step="0.01" type="number" />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" name="installments" placeholder="Parcelas" required type="number" />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" name="installmentAmount" placeholder="Valor parcela" step="0.01" type="number" />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={1} name="currentInstallment" placeholder="Parcela atual" type="number" />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={0} name="interestRate" placeholder="Juros %" step="0.01" type="number" />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={new Date().toISOString().slice(0, 10)} name="nextDueDate" required type="date" />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" name="status">
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="OVERDUE">Atrasado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Salvando..." : "Salvar financiamento"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
