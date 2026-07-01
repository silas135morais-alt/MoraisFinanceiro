"use client";

import { CheckCircle2, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type SelectOption = {
  id: string;
  name: string;
};

type PurchaseItem = {
  id: string;
  amount: number;
  categoryId: string;
  date: string;
  description: string;
  invoiceDate: string;
  installmentNumber?: number | null;
  installments: number;
  status: "PAID" | "PENDING" | "OVERDUE" | "CANCELED";
  title: string;
};

type PurchaseRowActionsProps = {
  categories: SelectOption[];
  purchase: PurchaseItem;
};

export function PurchaseRowActions({ categories, purchase }: PurchaseRowActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function updatePurchase(payload: Record<string, unknown>) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(`/api/credit-card-purchases/${purchase.id}`, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel atualizar.");
      return;
    }

    setIsEditing(false);
    router.refresh();
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updatePurchase({
      amount: Number(form.get("amount")),
      categoryId: String(form.get("categoryId")),
      date: String(form.get("date")),
      description: String(form.get("description") ?? ""),
      invoiceDate: String(form.get("invoiceDate") || form.get("date")),
      status: String(form.get("status")),
      title: String(form.get("title")),
    });
  }

  async function deletePurchase() {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(`/api/credit-card-purchases/${purchase.id}`, {
      method: "DELETE",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel apagar.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="min-w-64 space-y-3">
      <div className="flex flex-wrap gap-2">
        {purchase.status !== "PAID" ? (
          <Button disabled={isSubmitting} size="sm" type="button" onClick={() => updatePurchase({ status: "PAID" })}>
            <CheckCircle2 className="size-4" />
            Pagar parcela
          </Button>
        ) : null}
        <Button size="sm" type="button" variant="outline" onClick={() => setIsEditing((current) => !current)}>
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
          {isEditing ? "Fechar" : "Editar"}
        </Button>
        <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => setIsConfirmingDelete((current) => !current)}>
          <Trash2 className="size-4" />
          Apagar
        </Button>
      </div>

      {message ? <p className="text-xs text-destructive">{message}</p> : null}

      {isConfirmingDelete ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <p className="font-medium text-destructive">Apagar esta parcela?</p>
          <p className="mt-1 text-muted-foreground">Apenas esta parcela sera removida.</p>
          <div className="mt-3 flex gap-2">
            <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => setIsConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button disabled={isSubmitting} size="sm" type="button" onClick={deletePurchase}>
              Confirmar
            </Button>
          </div>
        </div>
      ) : null}

      {isEditing ? (
        <form className="grid gap-3 rounded-lg border bg-background p-3" onSubmit={handleEdit}>
          <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={purchase.title} name="title" placeholder="Compra" required />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={purchase.categoryId} name="categoryId" required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={purchase.amount} name="amount" required step="0.01" type="number" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Compra
              <input className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" defaultValue={purchase.date} name="date" required type="date" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Fatura
              <input className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" defaultValue={purchase.invoiceDate} name="invoiceDate" type="date" />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-1">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={purchase.status} name="status">
              <option value="PENDING">Pendente</option>
              <option value="PAID">Paga</option>
              <option value="OVERDUE">Atrasada</option>
              <option value="CANCELED">Cancelada</option>
            </select>
          </div>
          <input className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={purchase.description} name="description" placeholder="Descricao" />
          <Button className="w-full sm:w-fit" disabled={isSubmitting} size="sm" type="submit">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
