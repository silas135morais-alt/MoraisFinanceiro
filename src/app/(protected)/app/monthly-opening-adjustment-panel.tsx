"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { currency } from "@/lib/format";

type AccountOption = {
  id: string;
  name: string;
};

type ExistingAdjustment = {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  note: string | null;
};

type MonthlyOpeningAdjustmentPanelProps = {
  month: string;
  accounts: AccountOption[];
  adjustments: ExistingAdjustment[];
};

export function MonthlyOpeningAdjustmentPanel({ month, accounts, adjustments }: MonthlyOpeningAdjustmentPanelProps) {
  const router = useRouter();
  const current = adjustments[0];
  const [accountId, setAccountId] = useState(current?.accountId ?? accounts.find((account) => account.name === "PicPay")?.id ?? accounts[0]?.id ?? "");
  const [amount, setAmount] = useState(current ? String(current.amount) : "");
  const [note, setNote] = useState(current?.note ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/monthly-opening-adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        accountId,
        amount: Number(amount.replace(",", ".")),
        note: note.trim() || null,
      }),
    });

    setIsSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Não foi possível salvar o saldo inicial do mês.");
      return;
    }

    setMessage("Saldo inicial mensal salvo.");
    router.refresh();
  }

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Ajuste de abertura</p>
          <h3 className="mt-1 font-semibold tracking-normal">Saldo inicial de {month}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Registre dinheiro que já existia no início do mês. Este valor não é receita e fica limitado ao mês selecionado.
          </p>
        </div>
        {current ? <p className="text-lg font-semibold">{currency(current.amount)}</p> : null}
      </div>

      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_1fr_auto] sm:items-end" onSubmit={saveAdjustment}>
        <label className="grid gap-1 text-sm font-medium">
          Conta
          <select className="h-10 rounded-md border bg-background px-3 text-sm font-normal" value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
            <option value="" disabled>Selecione uma conta</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Valor
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" min="0" placeholder="45,37" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Observação
          <input className="h-10 rounded-md border bg-background px-3 text-sm font-normal" maxLength={300} placeholder="Ex.: saldo que já estava na conta" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <Button disabled={isSubmitting || !accountId} type="submit">{isSubmitting ? "Salvando..." : "Salvar ajuste"}</Button>
      </form>
      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
