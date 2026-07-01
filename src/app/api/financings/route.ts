import { created, handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { financingService } from "@/services/financing-service";

export async function GET() {
  try {
    return ok(await financingService.list(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await financingService.create(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
