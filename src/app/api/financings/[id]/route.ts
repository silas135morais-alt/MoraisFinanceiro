import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { financingService } from "@/services/financing-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await financingService.update(await requireUserId(), id, await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await financingService.remove(await requireUserId(), id));
  } catch (error) {
    return handleApiError(error);
  }
}
