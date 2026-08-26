import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { monthlyOpeningAdjustmentService } from "@/services/monthly-opening-adjustment-service";

export async function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get("month");
    if (!month) throw new Error("Mês do ajuste não informado.");
    return ok(await monthlyOpeningAdjustmentService.list(await requireUserId(), month));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return ok(await monthlyOpeningAdjustmentService.upsert(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
