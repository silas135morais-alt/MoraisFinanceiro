import { handleApiError, created } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { investmentService } from "@/services/investment-service";

export async function POST(request: Request) {
  try {
    return created(await investmentService.createContribution(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
