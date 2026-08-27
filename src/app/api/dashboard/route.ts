import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { monthParamToDate } from "@/lib/month-param";
import { getDashboard } from "@/services/dashboard-service";

export async function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get("month") ?? undefined;
    return ok(await getDashboard(await requireUserId(), monthParamToDate(month)));
  } catch (error) {
    return handleApiError(error);
  }
}
