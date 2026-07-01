import { created, handleApiError } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { importData } from "@/services/import-service";

export async function POST(request: Request) {
  try {
    return created(await importData(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
