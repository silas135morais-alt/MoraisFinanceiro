import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { creditCardService } from "@/services/credit-card-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    return ok(await creditCardService.updatePurchase(await requireUserId(), id, await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    return ok(await creditCardService.removePurchase(await requireUserId(), id));
  } catch (error) {
    return handleApiError(error);
  }
}
