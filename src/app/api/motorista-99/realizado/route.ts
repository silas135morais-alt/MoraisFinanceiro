import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { firstParam, monthParamToDate } from "@/lib/month-param";
import { driverDailyEarningService } from "@/services/driver-daily-earning-service";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const month = firstParam(new URL(request.url).searchParams.get("month") ?? undefined);
    const referenceDate = monthParamToDate(month);
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
