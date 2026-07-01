import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { categoryService } from "@/services/category-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    return ok(await categoryService.update(userId, id, await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    return ok(await categoryService.remove(userId, id));
  } catch (error) {
    return handleApiError(error);
  }
}
