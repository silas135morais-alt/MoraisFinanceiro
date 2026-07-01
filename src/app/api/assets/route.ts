import { handleApiError, created, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { assetService } from "@/services/asset-service";

export async function GET() {
  try {
    return ok(await assetService.list(await requireUserId()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    return created(await assetService.create(await requireUserId(), await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
