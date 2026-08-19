"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { z } from "zod";

import { AccountForm } from "@/components/forms/account-form";
import { Button } from "@/components/ui/button";
import { financialAccountSchema } from "@/validators/finance";

type AccountItem = {
  id: string;
  color: string;
  initialBalance: number;
  institution: string | null;
  isDefault: boolean;
  name: string;
  type: string;
};

export function AccountCreateAction() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const defaultValues = useMemo<Partial<z.input<typeof financialAccountSchema>>>(
    () => ({
      color: "#15803d",
      initialBalance: 0,
      institution: "",
      isDefault: false,
      name: "",
      type: "CHECKING",
    }),
    [],
  );

  async function createAccount(values: z.output<typeof financialAccountSchema>) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch("/api/accounts", {
      body: JSON.stringify(values),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel salvar a conta.");
      return;
    }

    setIsOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setIsOpen((current) => !current)} type="button">
        {isOpen ? <X className="size-4" /> : <Plus className="size-4" />}
        {isOpen ? "Fechar" : "Nova conta"}
      </Button>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      {isOpen ? (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <AccountForm defaultValues={defaultValues} isSubmitting={isSubmitting} onSubmit={createAccount} />
        </div>
      ) : null}
    </div>
  );
}

export function AccountRowActions({ account }: { account: AccountItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function updateAccount(values: z.output<typeof financialAccountSchema>) {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(`/api/accounts/${account.id}`, {
      body: JSON.stringify(values),
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

  async function deleteAccount() {
    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel apagar.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="min-w-56 space-y-3">
      <div className="flex flex-wrap gap-2">
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
          <p className="font-medium text-destructive">Apagar esta conta?</p>
          <p className="mt-1 text-muted-foreground">Contas com receitas ou despesas vinculadas nao podem ser apagadas.</p>
          <div className="mt-3 flex gap-2">
            <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={() => setIsConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button disabled={isSubmitting} size="sm" type="button" onClick={deleteAccount}>
              Confirmar
            </Button>
          </div>
        </div>
      ) : null}
      {isEditing ? (
        <div className="rounded-lg border bg-background p-3">
          <AccountForm defaultValues={account} isSubmitting={isSubmitting} onSubmit={updateAccount} />
        </div>
      ) : null}
    </div>
  );
}
