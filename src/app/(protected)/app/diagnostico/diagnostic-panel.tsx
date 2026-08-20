"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Fuel, Gauge, ShieldCheck } from "lucide-react";

import { currency, shortDate } from "@/lib/format";
import { DriverDailyEarningPanel } from "./driver-daily-earning-panel";

const STORAGE_KEY = "morais-financeiro-99-settings-v1";
const defaultSettings = {
  dailyGrossTarget: 250,
  workDays: 26,
  fuelPercent: 25,
  maintenancePercent: 8,
  emergencyPercent: 10,
  taxPercent: 5,
  debtPercent: 15,
  minimumReserve: 500,
};
type Settings = typeof defaultSettings;
type Debt = {
  id: string;
  name?: string;
  creditor?: string;
  title?: string;
  source: "FINANCING" | "PERSONAL_DEBT";
  outstandingBalance: number;
  installmentAmount?: number;
  nextDueDate?: string;
  dueDate?: string | null;
};
type Diagnostic = {
  currentCash: number;
  receivedIncome30d: number;
  futureIncome30d: number;
  transactionOutflow30d: number;
  projectedCash30d: number;
  minimumReserve: number;
  safeCash30d: number;
  personalDebtBalance: number;
  financingBalance: number;
  debts: Debt[];
  driverProfile: Settings & { saved: boolean };
};

export function DiagnosticPanel() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...defaultSettings, ...JSON.parse(stored) });
    } catch {
      // O servidor continua sendo a fonte principal das premissas.
    }
  }, []);

  useEffect(() => {
    fetch("/api/diagnostico", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const data = payload.data ?? payload;
        setDiagnostic(data);
        if (data.driverProfile) setSettings(data.driverProfile);
      })
      .catch(() => setDiagnostic(null))
      .finally(() => setLoading(false));
  }, []);

  const plan = useMemo(() => {
    if (!diagnostic) return null;
    const grossMonthly = settings.dailyGrossTarget * settings.workDays;
    const operatingPercent = (settings.fuelPercent + settings.maintenancePercent + settings.taxPercent) / 100;
    const operatingReserve = grossMonthly * operatingPercent;
    const emergencyReserve = grossMonthly * (settings.emergencyPercent / 100);
    const plannedNetMonthly = Math.max(0, grossMonthly - operatingReserve - emergencyReserve);
    const extraDebtPayment = Math.max(0, Math.min(diagnostic.safeCash30d, plannedNetMonthly * (settings.debtPercent / 100)));
    const urgentDebt = diagnostic.debts[0];
    const regularPayment = urgentDebt?.source === "FINANCING" ? urgentDebt.installmentAmount ?? 0 : 0;
    const monthlyPayment = regularPayment + extraDebtPayment;
    const monthsToPay = urgentDebt && monthlyPayment > 0 ? Math.ceil(urgentDebt.outstandingBalance / monthlyPayment) : null;
    const targetDate = monthsToPay ? new Date(Date.now() + monthsToPay * 30 * 24 * 60 * 60 * 1000) : null;
    return { grossMonthly, operatingReserve, emergencyReserve, plannedNetMonthly, extraDebtPayment, urgentDebt, monthlyPayment, monthsToPay, targetDate };
  }, [diagnostic, settings]);

  function updateSetting(field: keyof Settings, value: string) {
    setSettings((current) => ({ ...current, [field]: Number(value) || 0 }));
    setSavedMessage("");
  }

  async function refreshAfterEarning() {
    const response = await fetch("/api/diagnostico", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) return;
    const data = payload.data ?? payload;
    setDiagnostic(data);
    if (data.driverProfile) setSettings(data.driverProfile);
  }

  async function saveSettings() {
    setSaving(true);
    setSavedMessage("");
    try {
      const response = await fetch("/api/motorista-99", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar.");
      const saved = payload.data ?? payload;
      setSettings({ ...defaultSettings, ...saved });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultSettings, ...saved }));
      setSavedMessage("Premissas salvas.");
    } catch {
      setSavedMessage("Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Carregando diagnóstico...</div>;
  if (!diagnostic || !plan) return <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">O diagnóstico não está disponível agora.</div>;

  const upcomingDebt = plan.urgentDebt;
  const debtTitle = upcomingDebt?.source === "PERSONAL_DEBT" ? `${upcomingDebt.creditor} — ${upcomingDebt.title}` : upcomingDebt?.name;
  const debtDate = upcomingDebt?.source === "PERSONAL_DEBT" ? upcomingDebt.dueDate : upcomingDebt?.nextDueDate;

  return (
    <div className="space-y-5">
      <section className="surface-subtle rounded-lg border p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Diagnóstico</p>
            <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">O que posso pagar nos próximos 30 dias?</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Saldo confirmado + recebimentos previstos − despesas previstas.</p>
          </div>
          <Link href="/app/despesas?view=debts" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Ver dívidas <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Saldo real hoje" value={currency(diagnostic.currentCash)} helper="Dinheiro confirmado" icon={<Gauge className="size-4" />} />
        <MetricCard label="Recebimentos previstos" value={currency(diagnostic.futureIncome30d)} helper="Ainda não recebidos" icon={<CheckCircle2 className="size-4" />} />
        <MetricCard label="Despesas previstas" value={currency(diagnostic.transactionOutflow30d)} helper="Contas e cartões" icon={<CalendarDays className="size-4" />} />
        <MetricCard label="Disponível seguro" value={currency(diagnostic.safeCash30d)} helper={`Reserva de ${currency(diagnostic.minimumReserve)}`} icon={<ShieldCheck className="size-4" />} />
      </section>

      <DriverDailyEarningPanel onSaved={refreshAfterEarning} />

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Caixa projetado</h3>
            <p className="mt-1 text-sm text-muted-foreground">O valor considera apenas o que está confirmado ou previsto.</p>
          </div>
          <p className="text-2xl font-semibold">{currency(diagnostic.projectedCash30d)}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Saldo real" value={currency(diagnostic.currentCash)} />
          <MiniStat label="Entradas previstas" value={`+ ${currency(diagnostic.futureIncome30d)}`} />
          <MiniStat label="Saídas previstas" value={`− ${currency(diagnostic.transactionOutflow30d)}`} />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">Próxima prioridade</h3>
            <p className="mt-1 text-sm text-muted-foreground">A ordem considera atraso, prioridade e vencimento. O site não paga nada sozinho.</p>
          </div>
          {upcomingDebt ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Acompanhar</span> : null}
        </div>
        {upcomingDebt ? (
          <div className="mt-4 flex flex-col gap-4 rounded-lg bg-secondary/55 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{debtTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{upcomingDebt.source === "PERSONAL_DEBT" ? "Dívida pessoal" : "Financiamento"}{debtDate ? ` · ${shortDate(new Date(debtDate))}` : " · Sem vencimento"}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-lg font-semibold">{currency(upcomingDebt.outstandingBalance)}</p>
              <p className="text-xs text-muted-foreground">falta pagar</p>
            </div>
          </div>
        ) : <p className="mt-4 rounded-lg bg-secondary/55 px-4 py-3 text-sm text-muted-foreground">Nenhuma dívida ou financiamento ativo.</p>}
        {upcomingDebt ? <p className="mt-3 text-sm text-muted-foreground">Simulação: {plan.monthsToPay ? `aproximadamente ${plan.monthsToPay} mês(es), até ${plan.targetDate?.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}` : "aumente a renda livre ou reduza compromissos para calcular um prazo"}. Extra mensal estimado: {currency(plan.extraDebtPayment)}.</p> : null}
      </section>

      <details className="group rounded-lg border bg-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-semibold">
          <span className="flex items-center gap-2"><Fuel className="size-4 text-primary" />Premissas da 99</span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t px-5 pb-5 pt-4">
          <p className="text-sm text-muted-foreground">Esses valores estimam sua renda líquida e o extra possível para dívidas.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SettingInput label="Meta bruta diária" prefix="R$" value={settings.dailyGrossTarget} onChange={(value) => updateSetting("dailyGrossTarget", value)} />
            <SettingInput label="Dias trabalhados/mês" value={settings.workDays} onChange={(value) => updateSetting("workDays", value)} />
            <SettingInput label="Gasolina" suffix="%" value={settings.fuelPercent} onChange={(value) => updateSetting("fuelPercent", value)} />
            <SettingInput label="Manutenção" suffix="%" value={settings.maintenancePercent} onChange={(value) => updateSetting("maintenancePercent", value)} />
            <SettingInput label="Emergência" suffix="%" value={settings.emergencyPercent} onChange={(value) => updateSetting("emergencyPercent", value)} />
            <SettingInput label="Impostos/taxas" suffix="%" value={settings.taxPercent} onChange={(value) => updateSetting("taxPercent", value)} />
            <SettingInput label="Extra para dívidas" suffix="%" value={settings.debtPercent} onChange={(value) => updateSetting("debtPercent", value)} />
            <SettingInput label="Reserva mínima" prefix="R$" value={settings.minimumReserve} onChange={(value) => updateSetting("minimumReserve", value)} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Meta bruta mensal" value={currency(plan.grossMonthly)} />
            <MiniStat label="Custos e reserva" value={currency(plan.operatingReserve + plan.emergencyReserve)} />
            <MiniStat label="Renda líquida planejada" value={currency(plan.plannedNetMonthly)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" disabled={saving} onClick={saveSettings} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Salvando..." : "Salvar premissas"}</button>
            {savedMessage ? <span className="text-xs text-muted-foreground">{savedMessage}</span> : null}
          </div>
        </div>
      </details>
    </div>
  );
}

function MetricCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: ReactNode }) {
  return <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs font-medium uppercase tracking-wide">{label}</span>{icon}</div><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-secondary/55 px-3 py-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function SettingInput({ label, value, onChange, prefix, suffix }: { label: string; value: number; onChange: (value: string) => void; prefix?: string; suffix?: string }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span><span className="flex items-center rounded-lg border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/30">{prefix ? <span className="mr-2 text-xs text-muted-foreground">{prefix}</span> : null}<input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none" />{suffix ? <span className="ml-2 text-xs text-muted-foreground">{suffix}</span> : null}</span></label>;
}
