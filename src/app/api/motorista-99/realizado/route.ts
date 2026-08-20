import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { driverDailyEarningService } from "@/services/driver-daily-earning-service";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const month = new URL(request.url).searchParams.get("month");
    const referenceDate = month ? new Date(`${month}-01T12:00:00`) : new Date();
    if (Number.isNaN(referenceDate.getTime())) throw new Error("Mês inválido.");
    return ok(await driverDailyEarningService.list(userId, referenceDate));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return ok(await driverDailyEarningService.upsert(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
