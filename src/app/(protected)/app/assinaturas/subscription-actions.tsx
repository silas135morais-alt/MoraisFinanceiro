"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type SelectOption = {
  id: string;
  name: string;
};

type SubscriptionActionsProps = {
  accounts: SelectOption[];
  categories: SelectOption[];
};

export function SubscriptionActions({ accounts, categories }: SubscriptionActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isDisabled = accounts.length === 0 || categories.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/subscriptions", {
      body: JSON.stringify({
        accountId: String(form.get("accountId")),
        amount: Number(form.get("amount")),
        categoryId: String(form.get("categoryId")),
        frequency: String(form.get("frequency")),
        name: String(form.get("name")),
        nextChargeAt: String(form.get("nextChargeAt")),
        provider: String(form.get("provider") ?? ""),
        status: String(form.get("status")),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel salvar a assinatura.");
      return;
    }

    setIsOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button disabled={isDisabled} onClick={() => setIsOpen((current) => !current)} type="button">
        {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
        {isOpen ? "Fechar" : "Nova Assinatura"}
      </Button>

      {isDisabled ? <p className="text-xs text-muted-foreground">Cadastre uma conta e uma categoria de despesa antes de criar assinaturas.</p> : null}
      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {isOpen ? (
        <form className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input autoFocus className="h-10 rounded-md border bg-background px-3 text-sm" name="name" placeholder="Ex.: Netflix" required />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" name="provider" placeholder="Fornecedor opcional" />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
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
            <input className="h-10 rounded-md border bg-background px-3 text-sm" min="0.01" name="amount" placeholder="Valor" required step="0.01" type="number" />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={new Date().toISOString().slice(0, 10)} name="nextChargeAt" required type="date" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" name="frequency">
              <option value="MONTHLY">Mensal</option>
              <option value="WEEKLY">Semanal</option>
              <option value="BIWEEKLY">Quinzenal</option>
              <option value="YEARLY">Anual</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" name="status">
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="OVERDUE">Atrasado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Salvando..." : "Salvar assinatura"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
