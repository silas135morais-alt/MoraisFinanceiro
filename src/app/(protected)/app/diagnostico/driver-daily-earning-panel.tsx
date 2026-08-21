"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

type Props = {
  onSaved?: (accountId?: string) => Promise<void> | void;
  compact?: boolean;
  preferredAccountId?: string;
  sectionId?: string;
  continueAdding?: boolean;
};

const LAST_ACCOUNT_STORAGE_KEY = "morais-financeiro-last-account-v1";

function todayInput() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function feedback(difference: number) {
  if (difference >= 0) return `Acima da meta em ${currency(difference)}`;
  return `Abaixo da meta em ${currency(Math.abs(difference))}`;
}

export function DriverDailyEarningPanel({ onSaved, compact = false, preferredAccountId, sectionId = "ganho-99", continueAdding = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const edit99Id = searchParams.get("edit99");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState(() => todayInput());
  const [grossAmount, setGrossAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [lastAccountId, setLastAccountId] = useState(() => (typeof window === "undefined" ? "" : window.localStorage.getItem(LAST_ACCOUNT_STORAGE_KEY) ?? ""));
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const earningResponse = await fetch("/api/motorista-99/realizado", { cache: "no-store" });
      const earningPayload = await earningResponse.json();
      if (!earningResponse.ok) throw new Error(earningPayload.error ?? "Não foi possível carregar os realizados.");

      const nextOverview = (earningPayload.data ?? earningPayload) as Overview;
      setOverview(nextOverview);

      if (compact) return;

      const accountResponse = await fetch("/api/accounts", { cache: "no-store" });
      const accountPayload = await accountResponse.json();
      if (!accountResponse.ok) throw new Error(accountPayload.error ?? "Não foi possível carregar as contas.");
      const nextAccounts = (accountPayload.data ?? accountPayload) as Account[];
      setAccounts(nextAccounts.map((account) => ({ id: account.id, name: account.name })));
      const preferred = preferredAccountId || lastAccountId;
      setAccountId((current) => current || (preferred && nextAccounts.some((account) => account.id === preferred) ? preferred : nextAccounts[0]?.id || ""));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o registro diário.");
    } finally {
      setLoading(false);
    }
  }, [compact, lastAccountId, preferredAccountId]);

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

  const edit = useCallback((entry: Entry) => {
    setEditingId(entry.id);
    setDate(entry.date.slice(0, 10));
    setGrossAmount(String(entry.grossAmount));
    setAccountId(entry.accountId);
    setNotes(entry.notes ?? "");
    setMessage("");
    setError("");
  }, []);

  useEffect(() => {
    if (compact || !edit99Id || !overview) return;
    const entry = overview.entries.find((item) => item.id === edit99Id);
    if (!entry) return;
    edit(entry);
    window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }, [compact, edit, edit99Id, overview, sectionId]);

  function refreshAfterSave() {
    if (accountId) {
      window.localStorage.setItem(LAST_ACCOUNT_STORAGE_KEY, accountId);
      setLastAccountId(accountId);
    }
    void onSaved?.(accountId);
    router.refresh();
  }

  function applySavedEntry(entry: Entry) {
    setOverview((current) => {
      if (!current) return current;
      const previous = current.entries.find((item) => item.id === entry.id);
      const entries = [entry, ...current.entries.filter((item) => item.id !== entry.id)].sort((left, right) => right.date.localeCompare(left.date));
      const grossTotal = current.grossTotal - (previous?.grossAmount ?? 0) + entry.grossAmount;
      const targetTotal = current.targetTotal - (previous?.targetAmount ?? 0) + entry.targetAmount;
      return { ...current, entries, daysWorked: current.daysWorked + (previous ? 0 : 1), grossTotal, targetTotal, difference: grossTotal - targetTotal };
    });
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
      const savedEntry = (payload.data ?? payload) as Entry;
      applySavedEntry(savedEntry);
      refreshAfterSave();
      setMessage(wasEditing ? "Registro corrigido. A receita e o saldo foram atualizados." : "Receita registrada. Ela já entrou no histórico e no saldo.");
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
      const removed = overview?.entries.find((entry) => entry.id === id);
      setOverview((current) => {
        if (!current || !removed) return current;
        const grossTotal = current.grossTotal - removed.grossAmount;
        const targetTotal = current.targetTotal - removed.targetAmount;
        return { ...current, entries: current.entries.filter((entry) => entry.id !== id), daysWorked: Math.max(0, current.daysWorked - 1), grossTotal, targetTotal, difference: grossTotal - targetTotal };
      });
      refreshAfterSave();
      setMessage("Registro e receita correspondentes foram apagados.");
      if (editingId === id) resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível apagar o registro.");
    }
  }

  if (loading && !overview) {
    return <section className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Carregando realizado da 99...</section>;
  }

  if (!overview) {
    return <section className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">O realizado da 99 não está disponível agora.</section>;
  }

  if (compact) {
    const lastEntry = overview.entries[0];
    return (
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">Realizado da 99</h3>
            <p className="mt-1 text-sm text-muted-foreground">Os ganhos diários são registrados em Receitas para manter todo o histórico em um só lugar.</p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Meta diária: {currency(overview.dailyTarget)}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Dias lançados no mês" value={String(overview.daysWorked)} />
          <MiniStat label="Total realizado" value={currency(overview.grossTotal)} />
          <MiniStat label="Diferença para as metas" value={currency(overview.difference)} />
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-secondary/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{lastEntry ? `Último registro: ${shortDate(new Date(lastEntry.date))}, ${currency(lastEntry.grossAmount)}.` : "Nenhum ganho da 99 foi registrado neste mês."}</p>
          <Link href="/app/receitas#ganho-99" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">Registrar em Receitas</Link>
        </div>
      </section>
    );
  }

  return (
    <section id={sectionId} className="scroll-mt-6 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">Ganho da 99</h3>
          <p className="mt-1 text-sm text-muted-foreground">Registre quanto realmente fez no dia. O valor entra como receita recebida assim que for salvo.</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Meta diária: {currency(overview.dailyTarget)}</span>
      </div>

      <form onSubmit={save} className="mt-4 grid gap-3 rounded-lg bg-secondary/45 p-4 md:grid-cols-4">
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Dia trabalhado</span><input required type="date" max={todayInput()} value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Quanto fez no dia</span><span className="flex items-center rounded-lg border bg-background px-3"><span className="mr-2 text-xs text-muted-foreground">R$</span><input autoFocus required min="0.01" step="0.01" type="number" value={grossAmount} onChange={(event) => setGrossAmount(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none" placeholder="0,00" /></span></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Recebi em</span><select required value={accountId} onChange={(event) => setAccountId(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm"><option value="">Selecione a conta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Observação (opcional)</span><input value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Ex.: chuva, dia curto" /></label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-4">
          <button type="submit" disabled={saving || loading || accounts.length === 0} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Salvando..." : editingId ? "Salvar correção" : continueAdding ? "Salvar e lançar outro" : "Registrar ganho"}</button>
          {editingId ? <button type="button" onClick={() => resetForm()} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancelar</button> : null}
          {previewDifference !== null ? <span className={`text-xs font-medium ${previewDifference >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{feedback(previewDifference)}</span> : null}
        </div>
      </form>

      {message ? <p className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Dias lançados no mês" value={String(overview.daysWorked)} />
        <MiniStat label="Total realizado" value={currency(overview.grossTotal)} />
        <MiniStat label="Diferença para as metas" value={currency(overview.difference)} />
      </div>

      {overview.entries.length ? <div className="mt-5 space-y-2">{overview.entries.slice(0, 10).map((entry) => <div key={entry.id} className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{shortDate(new Date(entry.date))} <span className="font-normal text-muted-foreground">· {entry.accountName}</span></p><p className={`mt-1 text-xs ${entry.difference >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{feedback(entry.difference)}</p>{entry.notes ? <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p> : null}</div><div className="flex items-center gap-4 sm:text-right"><div><p className="font-semibold">{currency(entry.grossAmount)}</p><p className="text-xs text-muted-foreground">meta {currency(entry.targetAmount)}</p></div><button type="button" onClick={() => edit(entry)} className="text-xs font-semibold text-primary hover:underline">Corrigir</button><button type="button" onClick={() => void remove(entry.id)} className="text-xs font-semibold text-muted-foreground hover:text-destructive">Apagar</button></div></div>)}</div> : <p className="mt-5 rounded-lg bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">Nenhum dia lançado neste mês.</p>}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-secondary/55 px-3 py-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
