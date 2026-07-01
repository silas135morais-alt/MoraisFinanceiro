"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type SelectOption = {
  id: string;
  name: string;
};

type InvestmentActionsProps = {
  investments: SelectOption[];
};

export function InvestmentActions({ investments }: InvestmentActionsProps) {
  const router = useRouter();
  const [openPanel, setOpenPanel] = useState<"investment" | "contribution" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitJson(url: string, payload: Record<string, unknown>) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel salvar.");
      return;
    }

    setOpenPanel(null);
    router.refresh();
  }

  function createInvestment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submitJson("/api/investments", {
      currentValue: Number(form.get("currentValue")),
      institution: String(form.get("institution") ?? ""),
      name: String(form.get("name")),
      targetValue: Number(form.get("targetValue") || 0),
      type: String(form.get("type")),
    });
  }

  function createContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submitJson("/api/investment-contributions", {
      amount: Number(form.get("amount")),
      date: String(form.get("date")),
      description: String(form.get("description") ?? ""),
      investmentId: String(form.get("investmentId")),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpenPanel(openPanel === "investment" ? null : "investment")} type="button">
          {openPanel === "investment" ? <X className="size-4" /> : <Plus className="size-4" />}
          Novo Investimento
        </Button>
        <Button disabled={investments.length === 0} onClick={() => setOpenPanel(openPanel === "contribution" ? null : "contribution")} type="button" variant="outline">
          {openPanel === "contribution" ? <X className="size-4" /> : <Plus className="size-4" />}
          Novo Aporte
        </Button>
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {openPanel === "investment" ? (
        <form className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm" onSubmit={createInvestment}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input autoFocus className="h-10 rounded-md border bg-background px-3 text-sm" name="name" placeholder="Nome do investimento" required />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" name="institution" placeholder="Instituicao" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" name="type" required>
              <option value="FIXED_INCOME">Renda fixa</option>
              <option value="VARIABLE_INCOME">Renda variavel</option>
              <option value="FUND">Fundo</option>
              <option value="CRYPTO">Cripto</option>
              <option value="RETIREMENT">Previdencia</option>
              <option value="OTHER">Outro</option>
            </select>
            <input className="h-10 rounded-md border bg-background px-3 text-sm" name="currentValue" placeholder="Valor atual" required step="0.01" type="number" />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" name="targetValue" placeholder="Meta opcional" step="0.01" type="number" />
          </div>
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Salvando..." : "Salvar investimento"}
          </Button>
        </form>
      ) : null}

      {openPanel === "contribution" ? (
        <form className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm" onSubmit={createContribution}>
          <div className="grid gap-3 sm:grid-cols-3">
            <select autoFocus className="h-10 rounded-md border bg-background px-3 text-sm" name="investmentId" required>
              {investments.map((investment) => (
                <option key={investment.id} value={investment.id}>
                  {investment.name}
                </option>
              ))}
            </select>
            <input className="h-10 rounded-md border bg-background px-3 text-sm" name="amount" placeholder="Valor" required step="0.01" type="number" />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={new Date().toISOString().slice(0, 10)} name="date" required type="date" />
          </div>
          <input className="h-10 rounded-md border bg-background px-3 text-sm" name="description" placeholder="Descricao opcional" />
          <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Salvando..." : "Salvar aporte"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
