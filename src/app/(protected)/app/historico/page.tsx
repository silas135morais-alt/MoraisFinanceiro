import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { requireUserId } from "@/lib/auth-guard";
import { shortDate } from "@/lib/format";
import { listAuditLogs } from "@/services/audit-service";

export default async function HistoricoPage() {
  const logs = await listAuditLogs(await requireUserId());
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Histórico" title="Registro de alterações" description="Criações, edições, quitações, remoções, importações e fechamentos." />
      <DataTable columns={["Ação", "Entidade", "Mensagem", "Data"]} rows={logs.map((log) => [log.action, log.entity, log.message, shortDate(log.createdAt)])} />
    </div>
  );
}
