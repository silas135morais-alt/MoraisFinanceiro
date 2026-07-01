import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { getDashboard } from "@/services/dashboard-service";

export async function GET() {
  try {
    return ok(await getDashboard(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}
