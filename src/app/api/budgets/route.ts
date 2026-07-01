import { handleApiError, created, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { budgetService } from "@/services/budget-service";

export async function GET() {
  try {
    return ok(await budgetService.list(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await budgetService.create(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
