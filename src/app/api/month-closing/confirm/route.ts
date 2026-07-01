import { created, handleApiError } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { monthClosingService } from "@/services/month-closing-service";
import { monthClosingSchema } from "@/validators/finance";

export async function POST(request: Request) {
  try {
    const { monthId } = monthClosingSchema.parse(await request.json());
    return created(await monthClosingService.confirm(await requireUserId(), monthId));
  } catch (error) {
    return handleApiError(error);
  }
}
