import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { getFinancialDiagnostic } from "@/services/diagnostic-service";

export async function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get("month");
    const referenceDate = month ? new Date(`${month}-01T12:00:00`) : new Date();
    if (Number.isNaN(referenceDate.getTime())) throw new Error("Mês inválido.");
    return ok(await getFinancialDiagnostic(await requireUserId(), referenceDate));
  } catch (error) {
    return handleApiError(error);
  }
}
