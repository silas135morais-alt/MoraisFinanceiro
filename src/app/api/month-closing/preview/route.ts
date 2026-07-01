import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { monthClosingService } from "@/services/month-closing-service";

export async function GET(request: Request) {
  try {
    const monthId = new URL(request.url).searchParams.get("monthId");
    if (!monthId) throw new Error("monthId é obrigatório.");
    return ok(await monthClosingService.preview(await requireUserId(), monthId));
  } catch (error) {
    return handleApiError(error);
  }
}
