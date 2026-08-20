"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CarFront, CheckCircle2, Gauge, Fuel, ShieldCheck, Wrench } from "lucide-react";

import { currency, shortDate } from "@/lib/format";

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

type Diagnostic = {
  currentCash: number;
  futureIncome30d: number;
  futureOutflow30d: number;
  projectedCash30d: number;
  activeDebtBalance: number;
  debts: Array<{
    id: string;
    name: string;
    outstandingBalance: number;
    installmentAmount: number;
    installments: number;
    currentInstallment: number;
    interestRate: number;
    nextDueDate: string;
    status: string;
  }>;
  upcoming: Array<{ id: string; title: string; amount: number; dueDate: string; type: string }>;
};

export function DiagnosticPanel() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...defaultSettings, ...JSON.parse(stored) });
    } catch {
      // Mantém os valores padrão quando o navegador não permite ler preferências.
    }
  }, []);

  useEffect(() => {
    fetch("/api/diagnostico", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setDiagnostic(payload.data ?? payload))
      .catch(() => setDiagnostic(null))
      .finally(() => setLoading(false));
  }, []);

  const plan = useMemo(() => {
    if (!diagnostic) return null;
    const grossMonthly = settings.dailyGrossTarget * settings.workDays;
    const operatingPercent = (settings.fuelPercent + settings.maintenancePercent + settings.taxPercent) / 100;
    const operatingReserve = grossMonthly * operatingPercent;
    const emergencyReserve = grossMonthly * (settings.emergencyPercent / 100);
    const safeCash = Math.max(0, diagnostic.projectedCash30d - settings.minimumReserve);
    const plannedAfterCosts = Math.max(0, grossMonthly - operatingReserve - emergencyReserve - diagnostic.futureOutflow30d);
    const extraDebtPayment = Math.max(0, Math.min(safeCash, plannedAfterCosts) * (settings.debtPercent / 100));
    const urgentDebt = [...diagnostic.debts].sort((a, b) => {
      const aUrgent = a.status === "OVERDUE" ? 0 : 1;
      const bUrgent = b.status === "OVERDUE" ? 0 : 1;
      return aUrgent - bUrgent || new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    })[0];
    const monthlyPayment = urgentDebt ? urgentDebt.installmentAmount + extraDebtPayment : extraDebtPayment;
    const monthsToPay = urgentDebt && monthlyPayment > 0 ? Math.ceil(urgentDebt.outstandingBalance / monthlyPayment) : null;
    const targetDate = monthsToPay ? new Date(Date.now() + monthsToPay * 30 * 24 * 60 * 60 * 1000) : null;
    const reserveGap = Math.max(0, settings.minimumReserve - diagnostic.projectedCash30d);
    const netPerWorkDay = Math.max(0, (1 - operatingPercent - settings.emergencyPercent / 100) * settings.dailyGrossTarget);
    const extraDays = reserveGap > 0 && netPerWorkDay > 0 ? Math.ceil(reserveGap / netPerWorkDay) : 0;

    return {
      grossMonthly,
      operatingReserve,
      emergencyReserve,
      safeCash,
      plannedAfterCosts,
      extraDebtPayment,
      urgentDebt,
      monthlyPayment,
      monthsToPay,
      targetDate,
      reserveGap,
      extraDays,
    };
  }, [diagnostic, settings]);

  function updateSetting(field: keyof Settings, value: string) {
    setSettings((current) => ({ ...current, [field]: Number(value) || 0 }));
    setSaved(false);
  }

  function saveSettings() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
  }

  if (loading) return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Calculando seu diagnóstico...</div>;
  if (!diagnostic || !plan) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">Não foi possível carregar os dados do diagnóstico. Tente atualizar a página.</div>;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Diagnóstico financeiro</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">Como quitar e continuar rodando</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Usamos suas contas, lançamentos futuros e financiamentos ativos para criar um cenário editável. A projeção não é promessa: ela depende da qualidade dos lançamentos e das suas metas de trabalho.
            </p>
          </div>
          <Link href="/app/financiamentos" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary">Gerenciar dívidas</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Dinheiro hoje" value={currency(diagnostic.currentCash)} icon={<Gauge className="size-4" />} />
        <MetricCard label="Caixa previsto em 30 dias" value={currency(diagnostic.projectedCash30d)} icon={<CarFront className="size-4" />} />
        <MetricCard label="Compromissos em 30 dias" value={currency(diagnostic.futureOutflow30d)} icon={<AlertTriangle className="size-4" />} />
        <MetricCard label="Dívidas ativas" value={currency(diagnostic.activeDebtBalance)} icon={<ShieldCheck className="size-4" />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">Plano de quitação</h3>
              <p className="mt-1 text-sm text-muted-foreground">A dívida prioritária é calculada pelo atraso e pelo próximo vencimento.</p>
            </div>
            {plan.urgentDebt ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Prioridade</span> : null}
          </div>
          {plan.urgentDebt ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg bg-secondary/55 p-4">
                <p className="text-sm font-semibold">{plan.urgentDebt.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Próximo vencimento: {shortDate(new Date(plan.urgentDebt.nextDueDate))}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Saldo devedor" value={currency(plan.urgentDebt.outstandingBalance)} />
                  <MiniStat label="Parcela + extra" value={currency(plan.monthlyPayment)} />
                  <MiniStat label="Prazo estimado" value={plan.monthsToPay ? `${plan.monthsToPay} mês(es)` : "Ajuste a meta"} />
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                {plan.targetDate ? (
                  <p><strong>Data estimada de quitação:</strong> {plan.targetDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}. Isso pressupõe parcela regular de {currency(plan.urgentDebt.installmentAmount)} e extra mensal de {currency(plan.extraDebtPayment)}.</p>
                ) : (
                  <p><strong>Ajuste sua meta diária ou reduza compromissos</strong> para gerar valor extra de quitação. O sistema não encontrou caixa livre suficiente para prometer uma data.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="mr-2 inline size-4" />Nenhuma dívida ativa cadastrada. Quando você lançar uma, ela aparecerá neste plano.</div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Configuração do motorista 99</h3>
          <p className="mt-1 text-sm text-muted-foreground">Edite suas premissas. Elas ficam salvas neste navegador.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SettingInput label="Meta bruta diária" prefix="R$" value={settings.dailyGrossTarget} onChange={(value) => updateSetting("dailyGrossTarget", value)} />
            <SettingInput label="Dias trabalhados/mês" value={settings.workDays} onChange={(value) => updateSetting("workDays", value)} />
            <SettingInput label="Gasolina (%)" suffix="%" value={settings.fuelPercent} onChange={(value) => updateSetting("fuelPercent", value)} />
            <SettingInput label="Manutenção (%)" suffix="%" value={settings.maintenancePercent} onChange={(value) => updateSetting("maintenancePercent", value)} />
            <SettingInput label="Emergência (%)" suffix="%" value={settings.emergencyPercent} onChange={(value) => updateSetting("emergencyPercent", value)} />
            <SettingInput label="Impostos/taxas (%)" suffix="%" value={settings.taxPercent} onChange={(value) => updateSetting("taxPercent", value)} />
            <SettingInput label="Extra para dívidas (%)" suffix="%" value={settings.debtPercent} onChange={(value) => updateSetting("debtPercent", value)} />
            <SettingInput label="Reserva mínima" prefix="R$" value={settings.minimumReserve} onChange={(value) => updateSetting("minimumReserve", value)} />
          </div>
          <button type="button" onClick={saveSettings} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">{saved ? "Premissas salvas" : "Salvar premissas"}</button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2"><Fuel className="size-4 text-primary" /><h3 className="font-semibold">Meta mensal de trabalho</h3></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Receita bruta alvo" value={currency(plan.grossMonthly)} />
            <MiniStat label="Gasolina + manutenção + taxas" value={currency(plan.operatingReserve)} />
            <MiniStat label="Reserva de emergência" value={currency(plan.emergencyReserve)} />
            <MiniStat label="Extra projetado para dívida" value={currency(plan.extraDebtPayment)} />
          </div>
          {plan.reserveGap > 0 ? (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Para recompor a reserva mínima, a meta indica aproximadamente {plan.extraDays} dia(s) adicional(is) de trabalho no cenário atual.</p>
          ) : (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><Wrench className="mr-1 inline size-4" />A reserva mínima está coberta no cenário de 30 dias.</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Próximos compromissos</h3>
          <p className="mt-1 text-sm text-muted-foreground">O que pode consumir o caixa no horizonte do diagnóstico.</p>
          <div className="mt-4 space-y-2">
            {diagnostic.upcoming.length ? diagnostic.upcoming.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/55 px-3 py-3 text-sm">
                <div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{shortDate(new Date(item.dueDate))}</p></div>
                <span className="font-semibold text-rose-600 dark:text-rose-300">-{currency(item.amount)}</span>
              </div>
            )) : <p className="rounded-lg bg-secondary/55 px-3 py-4 text-sm text-muted-foreground">Nenhum compromisso pendente no horizonte.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs font-medium uppercase tracking-wide">{label}</span>{icon}</div><p className="mt-3 text-2xl font-semibold">{value}</p></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function SettingInput({ label, value, onChange, prefix, suffix }: { label: string; value: number; onChange: (value: string) => void; prefix?: string; suffix?: string }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span><span className="flex items-center rounded-lg border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/30">{prefix ? <span className="mr-2 text-xs text-muted-foreground">{prefix}</span> : null}<input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none" />{suffix ? <span className="ml-2 text-xs text-muted-foreground">{suffix}</span> : null}</span></label>;
}
