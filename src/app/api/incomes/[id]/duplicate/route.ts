import { created, handleApiError } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { incomeService } from "@/services/income-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    return created(await incomeService.duplicate(await requireUserId(), id));
  } catch (error) {
    return handleApiError(error);
  }
}
