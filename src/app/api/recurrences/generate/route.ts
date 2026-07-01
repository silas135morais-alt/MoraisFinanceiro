import { created, handleApiError } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { recurrenceService } from "@/services/recurrence-service";

export async function POST() {
  try {
    return created(await recurrenceService.generateDue(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
