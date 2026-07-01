import { Copy, LockKeyhole } from "lucide-react";

import { closeMonthAction } from "@/actions/operational-actions";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { monthClosingService } from "@/services/month-closing-service";
import { ensureUserWorkspace } from "@/services/workspace-service";

export default async function FechamentoPage() {
  const userId = await requireUserId();
  await ensureUserWorkspace(userId);
  const month = await prisma.month.findFirst({
    where: { userId, status: "OPEN" },
    orderBy: { startsAt: "desc" },
  });
  const preview = month ? await monthClosingService.preview(userId, month.id) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fechamento do mês"
        title="Resumo antes da confirmação"
        description="Revise o que será levado para o próximo mês. Lançamentos avulsos não são copiados."
      />

      {preview ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <SummaryCard title="Recorrências" value={String(preview.willCopy.recurring)} helper="Receitas e despesas recorrentes" icon={Copy} tone="blue" />
            <SummaryCard title="Avulsos ignorados" value={String(preview.willNotCopy.oneTimeIncomesAndExpenses)} helper="Não serão duplicados" icon={LockKeyhole} tone="amber" />
          </section>
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h3 className="font-semibold">Itens preservados</h3>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <p>Categorias: {preview.willCopy.categories}</p>
              <p>Cartões: {preview.willCopy.cards}</p>
              <p>Assinaturas: {preview.willCopy.subscriptions}</p>
              <p>Financiamentos: {preview.willCopy.financings}</p>
            </div>
            <form action={closeMonthAction.bind(null, preview.month.id)} className="mt-6">
              <Button type="submit">Fechar Mês</Button>
            </form>
          </section>
        </>
      ) : (
        <section className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
          Nenhum mês aberto encontrado.
        </section>
      )}
    </div>
  );
}
