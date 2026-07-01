import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { budgetService } from "@/services/budget-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await budgetService.update(await requireUserId(), id, await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await budgetService.remove(await requireUserId(), id));
  } catch (error) {
    return handleApiError(error);
  }
}
