"use client";

import { useState } from "react";
import { currency } from "@/lib/format";

type BudgetRow = {
  categoryId: string;
  categoryName: string;
  monthId: string;
  limit: number;
  alertPercent: number;
  spent: number;
};

export function BudgetBoard({ rows }: { rows: BudgetRow[] }) {
  const [items, setItems] = useState(rows);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(row: BudgetRow) {
    setSaving(row.categoryId);
    setMessage(null);
    const response = await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: row.categoryId, monthId: row.monthId, limit: row.limit, alertPercent: row.alertPercent }),
    });
    setSaving(null);
    setMessage(response.ok ? "Orçamentos salvos." : "Não foi possível salvar este orçamento.");
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-lg bg-secondary/55 px-4 py-3 text-sm text-muted-foreground">{message}</p> : null}
      {items.length ? items.map((row) => {
        const percent = row.limit > 0 ? Math.min(100, Math.round((row.spent / row.limit) * 100)) : 0;
        const warning = percent >= row.alertPercent;
        return (
          <div key={row.categoryId} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold">{row.categoryName}</p>
                <p className="mt-1 text-xs text-muted-foreground">Usado {currency(row.spent)} de {currency(row.limit)}</p>
              </div>
              <span className={warning ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"}>{percent}% usado</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className={warning ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-primary"} style={{ width: `${percent}%` }} /></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs font-medium text-muted-foreground">Limite mensal<input type="number" min="0.01" step="0.01" value={row.limit} onChange={(event) => setItems((current) => current.map((item) => item.categoryId === row.categoryId ? { ...item, limit: Number(event.target.value) || 0 } : item))} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" /></label>
              <label className="text-xs font-medium text-muted-foreground">Alertar em (%)<input type="number" min="1" max="100" value={row.alertPercent} onChange={(event) => setItems((current) => current.map((item) => item.categoryId === row.categoryId ? { ...item, alertPercent: Number(event.target.value) || 80 } : item))} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" /></label>
              <button type="button" onClick={() => save(row)} disabled={saving === row.categoryId || row.limit <= 0} className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving === row.categoryId ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        );
      }) : <p className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">Nenhuma categoria de despesa encontrada.</p>}
    </div>
  );
}
