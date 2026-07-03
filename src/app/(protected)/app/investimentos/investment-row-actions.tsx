"use client";

import { Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type InvestmentRowActionsProps = {
  investment: {
    id: string;
    currentValue: number;
    institution: string;
    name: string;
    targetValue: number | null;
    type: string;
  };
};

export function InvestmentRowActions({ investment }: InvestmentRowActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"edit" | "redeem" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(url: string, method: string, payload?: Record<string, unknown>) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(url, {
      body: payload ? JSON.stringify(payload) : undefined,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      method,
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel concluir a acao.");
      return;
    }

    setMode(null);
    router.refresh();
  }

  function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit(`/api/investments/${investment.id}`, "PUT", {
      currentValue: Number(form.get("currentValue")),
      institution: String(form.get("institution") ?? ""),
      name: String(form.get("name")),
      targetValue: Number(form.get("targetValue") || 0),
      type: String(form.get("type")),
    });
  }

  function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submit(`/api/investments/${investment.id}/redeem`, "POST", {
      amount: Number(form.get("amount")),
      date: String(form.get("date")),
      description: String(form.get("description") ?? ""),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setMode(mode === "edit" ? null : "edit")} size="sm" type="button" variant="outline">
          {mode === "edit" ? <X className="size-4" /> : <Pencil className="size-4" />}
          Editar
        </Button>
        <Button onClick={() => setMode(mode === "redeem" ? null : "redeem")} size="sm" type="button" variant="outline">
          {mode === "redeem" ? <X className="size-4" /> : <RotateCcw className="size-4" />}
          Resgatar
        </Button>
        <Button onClick={() => submit(`/api/investments/${investment.id}`, "DELETE")} size="sm" type="button" variant="outline">
          <Trash2 className="size-4" />
          Apagar
        </Button>
      </div>

      {message ? <p className="text-xs text-destructive">{message}</p> : null}

      {mode === "edit" ? (
        <form className="grid gap-2 rounded-lg border bg-background p-3" onSubmit={edit}>
          <input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={investment.name} name="name" required />
          <input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={investment.institution} name="institution" placeholder="Instituicao" />
          <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={investment.type} name="type" required>
            <option value="FIXED_INCOME">Renda fixa</option>
            <option value="VARIABLE_INCOME">Renda variavel</option>
            <option value="FUND">Fundo</option>
            <option value="CRYPTO">Cripto</option>
            <option value="RETIREMENT">Previdencia</option>
            <option value="OTHER">Outro</option>
          </select>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={investment.currentValue} name="currentValue" required step="0.01" type="number" />
            <input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={investment.targetValue ?? ""} name="targetValue" step="0.01" type="number" />
          </div>
          <Button disabled={isSubmitting} size="sm" type="submit">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      ) : null}

      {mode === "redeem" ? (
        <form className="grid gap-2 rounded-lg border bg-background p-3" onSubmit={redeem}>
          <input className="h-9 rounded-md border bg-background px-3 text-sm" max={investment.currentValue} min="0.01" name="amount" placeholder="Valor do resgate" required step="0.01" type="number" />
          <input className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={new Date().toISOString().slice(0, 10)} name="date" required type="date" />
          <input className="h-9 rounded-md border bg-background px-3 text-sm" name="description" placeholder="Descricao opcional" />
          <Button disabled={isSubmitting} size="sm" type="submit">
            {isSubmitting ? "Resgatando..." : "Confirmar resgate"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
