"use client";

import { Pencil, Plus, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { todayInput } from "@/lib/date-input";

type SelectOption = {
  id: string;
  name: string;
};

type FinancingItem = {
  id: string;
  name: string;
  categoryId: string;
  accountId: string;
  financedAmount: number;
  interestRate: number;
  installments: number;
  currentInstallment: number;
  outstandingBalance: number;
  installmentAmount: number;
  nextDueDate: string;
  status: "PAID" | "PENDING" | "OVERDUE" | "CANCELED";
};

type FinancingActionsProps = {
  accounts: SelectOption[];
  categories: SelectOption[];
  compact?: boolean;
  financings?: FinancingItem[];
  showList?: boolean;
};

type FinancingFormProps = {
  accounts: SelectOption[];
  categories: SelectOption[];
  initial?: FinancingItem;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
};

const inputClassName = "h-10 w-full rounded-xl border bg-background px-3 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-primary/25";

function FinancingForm({ accounts, categories, initial, isSubmitting, onSubmit, submitLabel }: FinancingFormProps) {
  return (
    <form className="grid gap-4 rounded-2xl border bg-card p-4 shadow-sm" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Nome do financiamento
          <input className={`${inputClassName} mt-1`} defaultValue={initial?.name ?? ""} name="name" placeholder="Financiamento da moto" required />
        </label>
        <label className="text-sm font-medium">
          Categoria
          <select className={`${inputClassName} mt-1`} defaultValue={initial?.categoryId ?? categories[0]?.id ?? ""} name="categoryId" required>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Pagar com
          <select className={`${inputClassName} mt-1`} defaultValue={initial?.accountId ?? accounts[0]?.id ?? ""} name="accountId" required>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Data da próxima parcela
          <input className={`${inputClassName} mt-1`} defaultValue={initial?.nextDueDate ?? todayInput()} name="nextDueDate" required type="date" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">
          Valor financiado
          <input className={`${inputClassName} mt-1`} defaultValue={initial?.financedAmount ?? ""} min="0.01" name="financedAmount" placeholder="0,00" required step="0.01" type="number" />
        </label>
        <label className="text-sm font-medium">
          Saldo devedor hoje
          <input className={`${inputClassName} mt-1`} defaultValue={initial?.outstandingBalance ?? ""} min="0.01" name="outstandingBalance" placeholder="0,00" required step="0.01" type="number" />
        </label>
        <label className="text-sm font-medium">
          Total de parcelas
          <input className={`${inputClassName} mt-1`} defaultValue={initial?.installments ?? 48} min="1" name="installments" required type="number" />
        </label>
        <label className="text-sm font-medium">
          Valor da parcela
          <input className={`${inputClassName} mt-1`} defaultValue={initial?.installmentAmount ?? ""} min="0.01" name="installmentAmount" placeholder="Calculado se vazio" step="0.01" type="number" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Parcela atual
          <input className={`${inputClassName} mt-1`} defaultValue={initial?.currentInstallment ?? 1} min="1" name="currentInstallment" required type="number" />
        </label>
        <label className="text-sm font-medium">
          Juros mensais (%)
          <input className={`${inputClassName} mt-1`} defaultValue={initial?.interestRate ?? 0} min="0" name="interestRate" step="0.01" type="number" />
        </label>
        <label className="text-sm font-medium">
          Situação
          <select className={`${inputClassName} mt-1`} defaultValue={initial?.status ?? "PENDING"} name="status">
            <option value="PENDING">Pendente</option>
            <option value="OVERDUE">Atrasado</option>
            <option value="PAID">Pago</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">O financiamento será salvo como compromisso próprio. As parcelas só entram como despesas quando o fechamento operacional gerar os lançamentos previstos.</p>
      <Button className="w-full sm:w-fit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}

export function FinancingActions({ accounts, categories, compact = false, financings = [], showList = false }: FinancingActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isDisabled = accounts.length === 0 || categories.length === 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>, financingId?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const financedAmount = Number(form.get("financedAmount"));
    const installments = Number(form.get("installments"));
    const installmentAmount = Number(form.get("installmentAmount")) || financedAmount / Math.max(installments, 1);
    const payload = {
      accountId: String(form.get("accountId")),
      categoryId: String(form.get("categoryId")),
      currentInstallment: Number(form.get("currentInstallment") || 1),
      financedAmount,
      installmentAmount,
      installments,
      interestRate: Number(form.get("interestRate") || 0),
      name: String(form.get("name")),
      nextDueDate: String(form.get("nextDueDate")),
      outstandingBalance: Number(form.get("outstandingBalance") || financedAmount),
      status: String(form.get("status")),
    };

    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(financingId ? `/api/financings/${financingId}` : "/api/financings", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: financingId ? "PUT" : "POST",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(body?.error ?? "Não foi possível salvar o financiamento. Tente novamente.");
        return;
      }
      setIsOpen(false);
      setEditingId(null);
      setMessage(financingId ? "Financiamento atualizado." : "Financiamento cadastrado.");
      router.refresh();
    } catch {
      setMessage("Não foi possível concluir agora. Verifique a conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function archiveFinancing(id: string) {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/financings/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setMessage("Não foi possível arquivar o financiamento.");
        return;
      }
      setMessage("Financiamento arquivado.");
      router.refresh();
    } catch {
      setMessage("Não foi possível concluir agora. Verifique a conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {compact ? (
        <Button disabled={isDisabled} onClick={() => { setIsOpen((current) => !current); setEditingId(null); }} type="button">
          {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          {isOpen ? "Fechar" : "Novo financiamento"}
        </Button>
      ) : (
        <PageHeader
          actions={<Button disabled={isDisabled} onClick={() => { setIsOpen((current) => !current); setEditingId(null); }} type="button">{isOpen ? <X className="size-4" /> : <Plus className="size-4" />}{isOpen ? "Fechar" : "Novo financiamento"}</Button>}
          description="Cadastre o financiamento da moto, acompanhe parcelas e corrija os dados quando necessário."
          eyebrow="Financiamentos"
          title="Compromissos de longo prazo"
        />
      )}
      {isDisabled ? <p className="text-xs text-muted-foreground">Cadastre uma conta e uma categoria de despesa antes de criar financiamentos.</p> : null}
      {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
      {isOpen ? <FinancingForm accounts={accounts} categories={categories} isSubmitting={isSubmitting} onSubmit={(event) => void handleSubmit(event)} submitLabel="Salvar financiamento" /> : null}
      {showList ? (
        <section className="space-y-3">
          {financings.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nenhum financiamento cadastrado. Use o botão acima para lançar o financiamento da moto.</p> : null}
          {financings.map((financing) => (
            <article className="rounded-2xl border bg-card p-4 shadow-sm" key={financing.id}>
              {editingId === financing.id ? (
                <FinancingForm accounts={accounts} categories={categories} initial={financing} isSubmitting={isSubmitting} onSubmit={(event) => void handleSubmit(event, financing.id)} submitLabel="Salvar correção" />
              ) : (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-semibold">{financing.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Parcela {financing.currentInstallment} de {financing.installments} · Próximo vencimento em {new Date(`${financing.nextDueDate}T12:00:00`).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-left lg:text-right"><p className="font-semibold">R$ {financing.installmentAmount.toFixed(2).replace(".", ",")}/mês</p><p className="text-xs text-muted-foreground">Saldo: R$ {financing.outstandingBalance.toFixed(2).replace(".", ",")}</p></div>
                    <Button size="sm" type="button" variant="outline" onClick={() => setEditingId(financing.id)}><Pencil className="size-4" />Corrigir</Button>
                    <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => void archiveFinancing(financing.id)}><RefreshCw className="size-4" />Arquivar</Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export type { FinancingItem };
