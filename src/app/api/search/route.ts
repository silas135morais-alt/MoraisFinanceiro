import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { globalSearch } from "@/services/search-service";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q") ?? "";
    return ok(await globalSearch(await requireUserId(), query));
  } catch (error) {
    return handleApiError(error);
  }
}
