import { handleApiError, created, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { creditCardService } from "@/services/credit-card-service";

export async function GET() {
  try {
    return ok(await creditCardService.list(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await creditCardService.create(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
