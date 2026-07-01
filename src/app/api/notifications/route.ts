import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { notificationService } from "@/services/notification-service";

export async function GET() {
  try {
    return ok(await notificationService.list(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
