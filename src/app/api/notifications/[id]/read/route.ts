import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { notificationService } from "@/services/notification-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    return ok(await notificationService.markAsRead(await requireUserId(), id));
  } catch (error) {
    return handleApiError(error);
  }
}
