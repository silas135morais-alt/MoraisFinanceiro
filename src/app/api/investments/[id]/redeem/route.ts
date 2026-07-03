import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { investmentService } from "@/services/investment-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  try {
    const { id } = await context.params;

    return ok(await investmentService.redeem(await requireUserId(), id, await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
