import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { getFinancialDiagnostic } from "@/services/diagnostic-service";

export async function GET() {
  try {
    return ok(await getFinancialDiagnostic(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
