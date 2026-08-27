import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { getFinancialDiagnostic } from "@/services/diagnostic-service";

export async function GET(request: Request) {
  try {
    const month = firstParam(new URL(request.url).searchParams.get("month") ?? undefined);
    const referenceDate = monthParamToDate(month);
    return ok(await getFinancialDiagnostic(await requireUserId(), referenceDate));
  } catch (error) {
    return handleApiError(error);
  }
}
