import { created, handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { subscriptionService } from "@/services/subscription-service";

export async function GET() {
  try {
    return ok(await subscriptionService.list(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await subscriptionService.create(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
