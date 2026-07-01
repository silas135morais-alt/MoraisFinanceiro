import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { creditCardService } from "@/services/credit-card-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await creditCardService.update(await requireUserId(), id, await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await creditCardService.remove(await requireUserId(), id));
  } catch (error) {
    return handleApiError(error);
  }
}
