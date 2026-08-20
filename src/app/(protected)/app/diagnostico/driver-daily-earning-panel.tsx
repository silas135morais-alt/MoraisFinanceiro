"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { currency, shortDate } from "@/lib/format";

type Account = { id: string; name: string };
type Entry = {
  id: string;
  date: string;
  grossAmount: number;
  targetAmount: number;
  difference: number;
  targetPercent: number;
  notes: string | null;
  accountId: string;
  accountName: string;
};
type Overview = {
  dailyTarget: number;
  daysWorked: number;
  grossTotal: number;
  targetTotal: number;
  difference: number;
  entries: Entry[];
};

type Props = { onSaved?: () => Promise<void> | void };

function todayInput() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function feedback(difference: number) {
  if (difference >= 0) return `Acima da meta em ${currency(difference)}`;
  return `Abaixo da meta em ${currency(Math.abs(difference))}`;
}

export function DriverDailyEarningPanel({ onSaved }: Props) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState(() => todayInput());
  const [grossAmount, setGrossAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [earningResponse, accountResponse] = await Promise.all([
        fetch("/api/motorista-99/realizado", { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
      ]);
      const earningPayload = await earningResponse.json();
      const accountPayload = await accountResponse.json();
      if (!earningResponse.ok) throw new Error(earningPayload.error ?? "Não foi possível carregar os realizados.");
      if (!accountResponse.ok) throw new Error(accountPayload.error ?? "Não foi possível carregar as contas.");
      const nextOverview = earningPayload.data ?? earningPayload;
      const nextAccounts = (accountPayload.data ?? accountPayload) as Account[];
      setOverview(nextOverview);
      setAccounts(nextAccounts.map((account) => ({ id: account.id, name: account.name })));
      setAccountId((current) => current || nextAccounts[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o registro diário.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewDifference = useMemo(() => {
    const target = overview?.dailyTarget ?? 0;
    const amount = Number(grossAmount);
    return Number.isFinite(amount) && amount > 0 ? amount - target : null;
  }, [grossAmount, overview?.dailyTarget]);

  function resetForm(clearMessage = true) {
    setEditingId(null);
    setDate(todayInput());
    setGrossAmount("");
    setNotes("");
    if (clearMessage) setMessage("");
    setError("");
  }

  function edit(entry: Entry) {
    setEditingId(entry.id);
    setDate(entry.date.slice(0, 10));
    setGrossAmount(String(entry.grossAmount));
    setAccountId(entry.accountId);
    setNotes(entry.notes ?? "");
    setMessage("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wasEditing = Boolean(editingId);
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(editingId ? `/api/motorista-99/realizado/${editingId}` : "/api/motorista-99/realizado", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, accountId, grossAmount, notes: notes || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar o realizado.");
      await load();
      await onSaved?.();
      setMessage(wasEditing ? "Registro corrigido. A receita e o saldo foram atualizados." : "Receita registrada. Ela já entrou em Receitas e no saldo.");
      resetForm(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o realizado.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Apagar este realizado também remove a receita correspondente?")) return;
    setError("");
    try {
      const response = await fetch(`/api/motorista-99/realizado/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível apagar o registro.");
      await load();
      await onSaved?.();
      setMessage("Registro e receita correspondentes foram apagados.");
      if (editingId === id) resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível apagar o registro.");
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">Realizado da 99</h3>
          <p className="mt-1 text-sm text-muted-foreground">Registre quanto realmente fez no dia. O valor entra como receita recebida assim que for salvo.</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Meta diária: {currency(overview?.dailyTarget ?? 0)}</span>
      </div>

      <form onSubmit={save} className="mt-4 grid gap-3 rounded-lg bg-secondary/45 p-4 md:grid-cols-4">
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Dia trabalhado</span><input required type="date" max={todayInput()} value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Quanto fez no dia</span><span className="flex items-center rounded-lg border bg-background px-3"><span className="mr-2 text-xs text-muted-foreground">R$</span><input required min="0.01" step="0.01" type="number" value={grossAmount} onChange={(event) => setGrossAmount(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none" placeholder="0,00" /></span></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Recebi em</span><select required value={accountId} onChange={(event) => setAccountId(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"><option value="">Selecione a conta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Observação (opcional)</span><input value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Ex.: chuva, dia curto" /></label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-4">
          <button type="submit" disabled={saving || loading || accounts.length === 0} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Salvando..." : editingId ? "Salvar correção" : "Registrar realizado"}</button>
          {editingId ? <button type="button" onClick={() => resetForm()} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancelar</button> : null}
          {previewDifference !== null ? <span className={`text-xs font-medium ${previewDifference >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{feedback(previewDifference)}</span> : null}
        </div>
      </form>

      {message ? <p className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Dias lançados no mês" value={String(overview?.daysWorked ?? 0)} />
        <MiniStat label="Total realizado" value={currency(overview?.grossTotal ?? 0)} />
        <MiniStat label="Diferença para as metas" value={currency(overview?.difference ?? 0)} />
      </div>

      {loading ? <p className="mt-5 text-sm text-muted-foreground">Carregando realizados...</p> : overview?.entries.length ? <div className="mt-5 space-y-2">{overview.entries.slice(0, 10).map((entry) => <div key={entry.id} className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{shortDate(new Date(entry.date))} <span className="font-normal text-muted-foreground">· {entry.accountName}</span></p><p className={`mt-1 text-xs ${entry.difference >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{feedback(entry.difference)}</p>{entry.notes ? <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p> : null}</div><div className="flex items-center gap-4 sm:text-right"><div><p className="font-semibold">{currency(entry.grossAmount)}</p><p className="text-xs text-muted-foreground">meta {currency(entry.targetAmount)}</p></div><button type="button" onClick={() => edit(entry)} className="text-xs font-semibold text-primary hover:underline">Corrigir</button><button type="button" onClick={() => void remove(entry.id)} className="text-xs font-semibold text-muted-foreground hover:text-destructive">Apagar</button></div></div>)}</div> : <p className="mt-5 rounded-lg bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">Nenhum dia lançado neste mês.</p>}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-secondary/55 px-3 py-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
