"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { currency } from "@/lib/format";

type BudgetRow = { id: string; categoryId: string; categoryName: string; monthId: string; limit: number; alertPercent: number; planningGroup: string | null; spent: number };
type Category = { id: string; name: string };

type BudgetBoardProps = {
  rows: BudgetRow[];
  categories: Category[];
  monthId: string;
  plannedNetMonthly: number;
  compact?: boolean;
};

export function BudgetBoard({ rows, categories, monthId, plannedNetMonthly, compact = false }: BudgetBoardProps) {
  const [items, setItems] = useState(rows);
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoryId: "", newCategoryName: "", limit: "", alertPercent: "80", planningGroup: "" });
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const totalLimit = useMemo(() => items.reduce((sum, row) => sum + row.limit, 0), [items]);

  async function save(row: BudgetRow) {
    setSaving(row.id);
    setMessage(null);
    const response = await fetch("/api/budgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: row.categoryId, monthId: row.monthId, limit: row.limit, alertPercent: row.alertPercent, planningGroup: row.planningGroup || null }) });
    setSaving(null);
    setMessage(response.ok ? "Planejamento salvo." : "Não foi possível salvar.");
  }

  async function addBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("new");
    setMessage(null);
    try {
      let categoryId = form.categoryId;
      let categoryName = availableCategories.find((item) => item.id === categoryId)?.name ?? form.newCategoryName.trim();
      if (!categoryId && form.newCategoryName.trim()) {
        const categoryResponse = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.newCategoryName.trim(), type: "EXPENSE" }) });
        const categoryPayload = await categoryResponse.json();
        if (!categoryResponse.ok) throw new Error(categoryPayload.error ?? "Não foi possível criar a categoria.");
        const category = categoryPayload.data ?? categoryPayload;
        categoryId = category.id;
        categoryName = category.name;
        setAvailableCategories((current) => [...current, { id: category.id, name: category.name }]);
      }
      if (!categoryId) throw new Error("Escolha uma categoria ou crie uma nova.");
      const response = await fetch("/api/budgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId, monthId, limit: Number(form.limit), alertPercent: Number(form.alertPercent), planningGroup: form.planningGroup.trim() || null }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar o planejamento.");
      const budget = payload.data ?? payload;
      setItems((current) => [...current.filter((item) => item.categoryId !== categoryId), { id: budget.id, categoryId, categoryName, monthId, limit: Number(budget.limit), alertPercent: budget.alertPercent, planningGroup: budget.planningGroup ?? null, spent: 0 }].sort((a, b) => a.categoryName.localeCompare(b.categoryName)));
      setForm({ categoryId: "", newCategoryName: "", limit: "", alertPercent: "80", planningGroup: "" });
      setShowForm(false);
      setMessage("Limite adicionado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível adicionar o limite.");
    } finally {
      setSaving(null);
    }
  }

  async function remove(row: BudgetRow) {
    setSaving(row.id);
    setMessage(null);
    const response = await fetch(`/api/budgets/${row.id}`, { method: "DELETE" });
    setSaving(null);
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== row.id));
      setMessage("Limite removido. Os lançamentos foram preservados.");
    } else setMessage("Não foi possível remover.");
  }

  return <div className="space-y-4">
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-semibold">{compact ? "Planejamento do mês" : "Seus orçamentos"}</h3><p className="mt-1 text-sm text-muted-foreground">Defina limites apenas para as categorias que deseja acompanhar. Total: {currency(totalLimit)}.</p></div>
        <button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"><Plus className="size-4" />{showForm ? "Fechar" : "Adicionar limite"}</button>
      </div>
      {showForm ? <form onSubmit={addBudget} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Categoria existente</span><select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value, newCategoryName: "" }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"><option value="">Escolher categoria</option>{availableCategories.filter((category) => !items.some((item) => item.categoryId === category.id)).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Ou nova categoria</span><input value={form.newCategoryName} onChange={(event) => setForm((current) => ({ ...current, newCategoryName: event.target.value, categoryId: "" }))} placeholder="Ex.: Trabalho 99" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Limite mensal</span><input required type="number" min="0.01" step="0.01" value={form.limit} onChange={(event) => setForm((current) => ({ ...current, limit: event.target.value }))} placeholder="500" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Alertar acima de (%)</span><input required type="number" min="1" max="100" value={form.alertPercent} onChange={(event) => setForm((current) => ({ ...current, alertPercent: event.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Grupo</span><input value={form.planningGroup} onChange={(event) => setForm((current) => ({ ...current, planningGroup: event.target.value }))} placeholder="Ex.: Trabalho, Saúde, Lazer" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        <div className="flex items-end"><button disabled={saving === "new"} type="submit" className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving === "new" ? "Salvando..." : "Salvar limite"}</button></div>
      </form> : null}
      {message ? <p className="mt-4 rounded-lg bg-secondary/55 px-4 py-3 text-sm text-muted-foreground">{message}</p> : null}
    </section>

    {items.length ? items.map((row) => {
      const percent = row.limit > 0 ? Math.min(100, Math.round((row.spent / row.limit) * 100)) : 0;
      const warning = percent >= row.alertPercent;
      const budgetShare = totalLimit > 0 ? (row.limit / totalLimit) * 100 : 0;
      const incomeShare = plannedNetMonthly > 0 ? (row.limit / plannedNetMonthly) * 100 : 0;
      return <div key={row.id} className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{row.categoryName}</p><p className="mt-1 text-xs text-muted-foreground">{row.planningGroup ? `${row.planningGroup} · ` : ""}Usado {currency(row.spent)} de {currency(row.limit)}</p></div><span className={warning ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"}>{percent}% usado</span></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"><div className={warning ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-primary"} style={{ width: `${percent}%` }} /></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3"><Mini label="Do planejamento" value={`${budgetShare.toFixed(1)}%`} /><Mini label="Da renda líquida" value={`${incomeShare.toFixed(1)}%`} /><Mini label="Disponível" value={currency(Math.max(0, row.limit - row.spent))} /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]"><label className="text-xs font-medium text-muted-foreground">Limite<input type="number" min="0.01" step="0.01" value={row.limit} onChange={(event) => setItems((current) => current.map((item) => item.id === row.id ? { ...item, limit: Number(event.target.value) || 0 } : item))} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" /></label><label className="text-xs font-medium text-muted-foreground">Alerta (%)<input type="number" min="1" max="100" value={row.alertPercent} onChange={(event) => setItems((current) => current.map((item) => item.id === row.id ? { ...item, alertPercent: Number(event.target.value) || 80 } : item))} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" /></label><label className="text-xs font-medium text-muted-foreground">Grupo<input value={row.planningGroup ?? ""} onChange={(event) => setItems((current) => current.map((item) => item.id === row.id ? { ...item, planningGroup: event.target.value } : item))} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground" /></label><button type="button" onClick={() => save(row)} disabled={saving === row.id || row.limit <= 0} className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving === row.id ? "Salvando..." : "Salvar"}</button><button type="button" onClick={() => remove(row)} disabled={saving === row.id} className="inline-flex items-center justify-center gap-1 self-end rounded-lg border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50"><Trash2 className="size-3.5" />Remover</button></div>
      </div>;
    }) : <p className="rounded-lg border bg-card px-4 py-8 text-sm text-muted-foreground">Nenhum limite definido para este mês.</p>}
  </div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-secondary/55 px-3 py-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
