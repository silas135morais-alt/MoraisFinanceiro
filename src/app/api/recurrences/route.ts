import { created, handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { recurrenceService } from "@/services/recurrence-service";

export async function GET() {
  try {
    return ok(await recurrenceService.list(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await recurrenceService.create(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
