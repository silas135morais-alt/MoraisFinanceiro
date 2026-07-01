"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-lg border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Algo não saiu como esperado</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Não foi possível carregar esta área agora. Tente novamente em instantes.
      </p>
      <Button className="mt-5" onClick={reset} type="button">
        Tentar novamente
      </Button>
    </section>
  );
}
