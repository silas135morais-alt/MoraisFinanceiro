import { handleApiError, created, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { investmentService } from "@/services/investment-service";

export async function GET() {
  try {
    return ok(await investmentService.list(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await investmentService.create(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
