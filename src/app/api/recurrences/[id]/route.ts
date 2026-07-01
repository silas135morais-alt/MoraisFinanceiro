import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { recurrenceService } from "@/services/recurrence-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await recurrenceService.updateSeries(await requireUserId(), id, await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
