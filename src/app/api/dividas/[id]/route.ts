import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { personalDebtService, serializePersonalDebt } from "@/services/personal-debt-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const item = await personalDebtService.update(await requireUserId(), id, await request.json());
    return ok(serializePersonalDebt(item));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const action = (await request.json()) as { action?: string };
    const userId = await requireUserId();
    const item = action.action === "cancel"
      ? await personalDebtService.cancel(userId, id)
      : await personalDebtService.markPaid(userId, id);
    return ok(serializePersonalDebt(item));
  } catch (error) {
    return handleApiError(error);
  }
}
