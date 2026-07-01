import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { payablesService } from "@/services/payables-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await payablesService.markAsPaid(await requireUserId(), id));
  } catch (error) {
    return handleApiError(error);
  }
}
