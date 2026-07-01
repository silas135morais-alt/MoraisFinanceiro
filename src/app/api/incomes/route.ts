import { handleApiError, created, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { parseListQuery } from "@/lib/request-query";
import { incomeService } from "@/services/income-service";

export async function GET(request: Request) {
  try {
    return ok(await incomeService.list(await requireUserId(), parseListQuery(request)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await incomeService.create(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
