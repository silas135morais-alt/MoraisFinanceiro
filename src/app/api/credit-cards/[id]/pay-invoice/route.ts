import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { creditCardService } from "@/services/credit-card-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { endDate, startDate } = (await request.json()) as { endDate?: string; startDate?: string };

    if (!startDate || !endDate) {
      throw new Error("Periodo da fatura invalido.");
    }

    return ok(await creditCardService.payInvoice(await requireUserId(), id, startDate, endDate));
  } catch (error) {
    return handleApiError(error);
  }
}
