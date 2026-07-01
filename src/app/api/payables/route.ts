import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { payablesService } from "@/services/payables-service";

export async function GET() {
  try {
    return ok(await payablesService.listPayables(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
