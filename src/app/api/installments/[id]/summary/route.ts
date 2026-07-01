import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { installmentService } from "@/services/installment-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await installmentService.summary(await requireUserId(), id));
  } catch (error) {
    return handleApiError(error);
  }
}
