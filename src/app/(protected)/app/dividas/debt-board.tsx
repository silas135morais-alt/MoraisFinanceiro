"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Pencil, Plus, Save, X } from "lucide-react";

import { currency, shortDate } from "@/lib/format";

type DebtForm = {
  creditor: string;
  title: string;
  outstandingBalance: string;
  interestRate: string;
  dueDate: string;
  priority: string;
  notes: string;
};

export type DebtRow = {
  id: string;
  creditor: string;
  title: string;
  originalAmount: number;
  outstandingBalance: number;
  recordedBalance: number;
  interestBaseBalance: number;
  interestRate: number;
  interestStartedAt: string | null;
  accruedInterest: number;
  daysAccrued: number;
  dueDate: string | null;
  priority: string;
  status: string;
  notes: string | null;
};

const emptyForm: DebtForm = {
  creditor: "",
  title: "",
  outstandingBalance: "",
  interestRate: "0",
  dueDate: "",
  priority: "URGENT",
  notes: "",
};

export function DebtBoard({ initialRows, compact = false }: { initialRows: DebtRow[]; compact?: boolean }) {
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState<DebtForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<DebtForm>(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
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
      const balance = Number(form.outstandingBalance);
      const response = await fetch("/api/dividas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditor: form.creditor,
          title: form.title,
          originalAmount: balance,
          outstandingBalance: balance,
          interestRate: Number(form.interestRate) || 0,
          dueDate: form.dueDate || null,
          priority: form.priority,
          notes: form.notes || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível cadastrar a dívida.");
      setForm(emptyForm);
      setIsOpen(false);
      await reload();
      setMessage("Dívida adicionada às prioridades do Diagnóstico.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar a dívida.");
    } finally {
      setSaving(false);
    }
  }

  async function updateDebt(id: string) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/dividas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditor: editingForm.creditor,
          title: editingForm.title,
          outstandingBalance: Number(editingForm.outstandingBalance),
          interestRate: Number(editingForm.interestRate) || 0,
          dueDate: editingForm.dueDate || null,
          priority: editingForm.priority,
          notes: editingForm.notes || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível corrigir a dívida.");
      setEditingId(null);
      await reload();
      setMessage("Dívida corrigida. A contagem dos juros foi reiniciada com a nova base.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível corrigir a dívida.");
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
      setMessage(actionName === "paid" ? "Dívida marcada como quitada." : "Dívida arquivada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a dívida.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: DebtRow) {
    setEditingId(item.id);
    setEditingForm({
      creditor: item.creditor,
      title: item.title,
      outstandingBalance: String(item.recordedBalance),
      interestRate: String(item.interestRate),
      dueDate: item.dueDate?.slice(0, 10) ?? "",
      priority: item.priority,
      notes: item.notes ?? "",
    });
  }

  return (
    <div className="space-y-4">
      {!compact ? (
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Dívidas pessoais</h3>
          <p className="mt-1 text-sm text-muted-foreground">Use esta área para contas pessoais que você quer acompanhar e quitar. Financiamentos continuam em Despesas.</p>
        </section>
      ) : null}

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Dívidas pessoais</h3>
            <p className="mt-1 text-sm text-muted-foreground">O saldo é atualizado na tela quando os juros mensais estiverem ativados.</p>
          </div>
          <button type="button" onClick={() => setIsOpen((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
            {isOpen ? "Fechar" : "Adicionar dívida"}
          </button>
        </div>
        {isOpen ? <DebtFormView form={form} saving={saving} onChange={setForm} onSubmit={submit} submitLabel="Adicionar dívida" /> : null}
        {message ? <p className="mt-4 rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Acompanhamento</h3>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length ? `${rows.length} dívida(s) em aberto` : "Nenhuma dívida cadastrada"}</p>
          </div>
          <p className="text-lg font-semibold">{currency(total)}</p>
        </div>
        <div className="mt-5 space-y-3">
          {rows.length ? rows.map((item) => (
            <article key={item.id} className="rounded-lg border bg-background p-4">
              {editingId === item.id ? (
                <DebtFormView form={editingForm} saving={saving} onChange={setEditingForm} onSubmit={(event) => { event.preventDefault(); void updateDebt(item.id); }} submitLabel="Salvar correção" />
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{item.creditor}</h4><PriorityBadge priority={item.priority} /></div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.dueDate ? `Vencimento: ${shortDate(new Date(item.dueDate))}` : "Sem vencimento definido"}</p>
                    </div>
                    <div className="text-left sm:text-right"><p className="text-lg font-semibold">{currency(item.outstandingBalance)}</p><p className="text-xs text-muted-foreground">saldo atualizado</p></div>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                    <InfoLine label="Valor original" value={currency(item.originalAmount)} />
                    <InfoLine label="Saldo informado" value={currency(item.recordedBalance)} />
                    <InfoLine label="Juros mensais" value={item.interestRate > 0 ? `${item.interestRate.toFixed(2)}% ao mês` : "Sem juros"} />
                  </div>
                  <p className="mt-3 rounded-lg bg-secondary/55 px-3 py-2 text-xs text-muted-foreground">
                    {item.interestRate > 0
                      ? `Acréscimo calculado: ${currency(item.accruedInterest)} em ${item.daysAccrued} dia(s). Atualiza ao abrir ou recarregar a tela; nada é pago automaticamente.`
                      : "Sem juros mensais: o saldo permanece igual ao valor informado até você corrigi-lo."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" disabled={saving} onClick={() => startEdit(item)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"><Pencil className="size-3.5" />Corrigir</button>
                    <button type="button" disabled={saving} onClick={() => action(item.id, "paid")} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"><CheckCircle2 className="size-3.5" />Marcar quitada</button>
                    <button type="button" disabled={saving} onClick={() => action(item.id, "cancel")} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50"><X className="size-3.5" />Arquivar</button>
                  </div>
                </>
              )}
            </article>
          )) : <p className="rounded-lg bg-secondary/55 px-3 py-4 text-sm text-muted-foreground">Adicione uma dívida para acompanhar o saldo e a prioridade no Diagnóstico.</p>}
        </div>
      </section>
    </div>
  );
}

function DebtFormView({ form, saving, onChange, onSubmit, submitLabel }: { form: DebtForm; saving: boolean; onChange: (form: DebtForm) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; submitLabel: string }) {
  const interestEnabled = Number(form.interestRate) > 0;

  function toggleInterest() {
    onChange({ ...form, interestRate: interestEnabled ? "0" : "1" });
  }

  return <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <Field label="Credor" value={form.creditor} onChange={(value) => onChange({ ...form, creditor: value })} placeholder="Ex.: OdontoMarco" required />
    <Field label="O que é?" value={form.title} onChange={(value) => onChange({ ...form, title: value })} placeholder="Ex.: Tratamento odontológico" required />
    <Field label="Saldo a quitar" hint="Quanto falta pagar hoje" type="number" min="0.01" step="0.01" value={form.outstandingBalance} onChange={(value) => onChange({ ...form, outstandingBalance: value })} placeholder="850" required />
    <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Juros mensais</span><button type="button" role="switch" aria-checked={interestEnabled} onClick={toggleInterest} className={`flex h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-sm font-medium transition ${interestEnabled ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground"}`}><span>{interestEnabled ? "Aplicar juros mensais" : "Sem juros mensais"}</span><span className={`rounded-full px-2 py-1 text-[11px] ${interestEnabled ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{interestEnabled ? "Ativo" : "Inativo"}</span></button>{interestEnabled ? <input aria-label="Taxa de juros mensais" className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm" min="0" max="100" step="0.01" type="number" value={form.interestRate} onChange={(event) => onChange({ ...form, interestRate: event.target.value })} /> : <span className="mt-1 block text-[11px] text-muted-foreground">Ative para informar a taxa, por exemplo 1,00% ao mês.</span>}{interestEnabled ? <span className="mt-1 block text-[11px] text-muted-foreground">A atualização usa juros compostos diariamente, com mês de 30 dias.</span> : null}</label>
    <Field label="Vencimento" type="date" value={form.dueDate} onChange={(value) => onChange({ ...form, dueDate: value })} />
    <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Prioridade</span><select value={form.priority} onChange={(event) => onChange({ ...form, priority: event.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"><option value="URGENT">Urgente</option><option value="HIGH">Alta</option><option value="NORMAL">Normal</option><option value="LOW">Baixa</option></select></label>
    <label className="block text-sm sm:col-span-2"><span className="mb-1 block text-xs font-medium text-muted-foreground">Observação</span><textarea value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Opcional" /></label>
    <div className="flex items-end"><button disabled={saving} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{submitLabel === "Salvar correção" ? <Save className="size-4" /> : <Plus className="size-4" />}{saving ? "Salvando..." : submitLabel}</button></div>
  </form>;
}

function Field({ label, hint, value, onChange, placeholder, type = "text", min, step, required }: { label: string; hint?: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; min?: string; step?: string; required?: boolean }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{hint ? <span className="mb-1 block text-[11px] text-muted-foreground">{hint}</span> : null}<input required={required} type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-secondary/45 px-3 py-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const label = priority === "URGENT" ? "Urgente" : priority === "HIGH" ? "Alta" : priority === "NORMAL" ? "Normal" : "Baixa";
  return <span className={priority === "URGENT" ? "rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-200" : "rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-200"}>{label}</span>;
}
