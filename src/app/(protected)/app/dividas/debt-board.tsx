"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Plus, X } from "lucide-react";

import { currency, shortDate } from "@/lib/format";

type DebtRow = {
  id: string;
  creditor: string;
  title: string;
  originalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  dueDate: string | null;
  priority: string;
  status: string;
  notes: string | null;
};

const emptyForm = {
  creditor: "",
  title: "",
  originalAmount: "",
  outstandingBalance: "",
  interestRate: "0",
  dueDate: "",
  priority: "URGENT",
  notes: "",
};

export function DebtBoard({ initialRows }: { initialRows: DebtRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState(emptyForm);
  const [isOpen, setIsOpen] = useState(initialRows.length === 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const total = useMemo(() => rows.reduce((sum, item) => sum + item.outstandingBalance, 0), [rows]);

  async function reload() {
    const response = await fetch("/api/dividas", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível atualizar as dívidas.");
    setRows(payload.data ?? payload);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/dividas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          originalAmount: Number(form.originalAmount),
          outstandingBalance: Number(form.outstandingBalance || form.originalAmount),
          interestRate: Number(form.interestRate || 0),
          dueDate: form.dueDate || null,
          notes: form.notes || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível cadastrar a dívida.");
      setForm(emptyForm);
      setIsOpen(false);
      await reload();
      setMessage("Dívida cadastrada e priorizada no Diagnóstico.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar a dívida.");
    } finally {
      setSaving(false);
    }
  }

  async function action(id: string, actionName: "paid" | "cancel") {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/dividas/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível atualizar a dívida.");
      await reload();
      setMessage(actionName === "paid" ? "Dívida marcada como quitada." : "Dívida cancelada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a dívida.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Cadastro de dívidas</h3>
            <p className="mt-1 text-sm text-muted-foreground">O total aberto é usado no cálculo de quitação, mas nenhum pagamento é executado automaticamente.</p>
          </div>
          <button type="button" onClick={() => setIsOpen((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
            {isOpen ? "Fechar cadastro" : "Nova dívida"}
          </button>
        </div>
        {isOpen ? (
          <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Credor" value={form.creditor} onChange={(value) => setForm((current) => ({ ...current, creditor: value }))} placeholder="Ex.: OdontoMarco" required />
            <Field label="Descrição" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="Ex.: Tratamento odontológico" required />
            <Field label="Valor original" type="number" min="0.01" step="0.01" value={form.originalAmount} onChange={(value) => setForm((current) => ({ ...current, originalAmount: value, outstandingBalance: current.outstandingBalance || value }))} placeholder="850" required />
            <Field label="Saldo atual" type="number" min="0.01" step="0.01" value={form.outstandingBalance} onChange={(value) => setForm((current) => ({ ...current, outstandingBalance: value }))} placeholder="850" required />
            <Field label="Juros ao mês (%)" type="number" min="0" step="0.01" value={form.interestRate} onChange={(value) => setForm((current) => ({ ...current, interestRate: value }))} placeholder="0" />
            <Field label="Vencimento" type="date" value={form.dueDate} onChange={(value) => setForm((current) => ({ ...current, dueDate: value }))} />
            <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Prioridade</span><select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"><option value="URGENT">Urgente</option><option value="HIGH">Alta</option><option value="NORMAL">Normal</option><option value="LOW">Baixa</option></select></label>
            <label className="block text-sm sm:col-span-2"><span className="mb-1 block text-xs font-medium text-muted-foreground">Observação</span><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Informações que ajudam no acompanhamento" /></label>
            <div className="flex items-end"><button disabled={saving} type="submit" className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Salvando..." : "Cadastrar dívida"}</button></div>
          </form>
        ) : null}
        {message ? <p className="mt-4 rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold">Dívidas em aberto</h3><p className="mt-1 text-sm text-muted-foreground">A ordenação considera atraso, prioridade e vencimento.</p></div><p className="text-lg font-semibold">{currency(total)}</p></div>
        <div className="mt-5 space-y-3">
          {rows.length ? rows.map((item) => (
            <article key={item.id} className="rounded-lg border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{item.creditor}</h4><PriorityBadge priority={item.priority} /></div><p className="mt-1 text-sm text-muted-foreground">{item.title}</p>{item.dueDate ? <p className="mt-1 text-xs text-muted-foreground">Vencimento: {shortDate(new Date(item.dueDate))}</p> : <p className="mt-1 text-xs text-muted-foreground">Sem vencimento definido</p>}</div>
                <div className="text-left sm:text-right"><p className="text-lg font-semibold">{currency(item.outstandingBalance)}</p><p className="text-xs text-muted-foreground">saldo atual</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => action(item.id, "paid")} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"><CheckCircle2 className="size-3.5" />Marcar quitada</button><button type="button" disabled={saving} onClick={() => action(item.id, "cancel")} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50"><X className="size-3.5" />Cancelar</button></div>
            </article>
          )) : <p className="rounded-lg bg-secondary/55 px-3 py-4 text-sm text-muted-foreground">Nenhuma dívida pessoal em aberto. Cadastre a primeira para vê-la no Diagnóstico.</p>}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", min, step, required }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; min?: string; step?: string; required?: boolean }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span><input required={required} type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const label = priority === "URGENT" ? "Urgente" : priority === "HIGH" ? "Alta" : priority === "NORMAL" ? "Normal" : "Baixa";
  return <span className={priority === "URGENT" ? "rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-200" : "rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-200"}>{label}</span>;
}
