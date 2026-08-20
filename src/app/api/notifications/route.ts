import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { notificationService } from "@/services/notification-service";

export async function GET() {
  try {
    const userId = await requireUserId();
    await Promise.all([
      notificationService.generateDueNotifications(userId),
      notificationService.generateOperationalNotifications(userId),
    ]);
    return ok(await notificationService.list(userId));
  } catch (error) {
    return handleApiError(error);
  }
}
