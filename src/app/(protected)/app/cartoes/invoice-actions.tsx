"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type InvoicePayButtonProps = {
  cardId: string;
  disabled?: boolean;
  endDate: string;
  startDate: string;
};

export function InvoicePayButton({ cardId, disabled = false, endDate, startDate }: InvoicePayButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function payInvoice() {
    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch(`/api/credit-cards/${cardId}/pay-invoice`, {
      body: JSON.stringify({ endDate, startDate }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "Nao foi possivel pagar a fatura.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-4 space-y-2">
      <Button className="w-full" disabled={disabled || isSubmitting} size="sm" type="button" onClick={payInvoice}>
        <CheckCircle2 className="size-4" />
        {isSubmitting ? "Pagando..." : "Pagar fatura selecionada"}
      </Button>
      {message ? <p className="text-xs text-destructive">{message}</p> : null}
    </div>
  );
}
