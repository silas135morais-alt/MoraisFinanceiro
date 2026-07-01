import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { listAuditLogs } from "@/services/audit-service";

export async function GET() {
  try {
    return ok(await listAuditLogs(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
