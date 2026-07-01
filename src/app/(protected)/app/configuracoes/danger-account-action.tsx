"use client";

import { Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function DangerAccountAction() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button onClick={() => setIsOpen((current) => !current)} type="button" variant="outline">
        {isOpen ? <X className="size-4" /> : <Trash2 className="size-4" />}
        {isOpen ? "Cancelar" : "Excluir conta"}
      </Button>

      {isOpen ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Exclusao permanente ainda nao esta habilitada.</p>
          <p className="mt-2 text-muted-foreground">
            Por seguranca, esta acao precisa de confirmacao por senha/sessao e rotina de backup antes de remover dados financeiros.
            Use exportacao antes de solicitar a exclusao definitiva.
          </p>
        </div>
      ) : null}
    </div>
  );
}
