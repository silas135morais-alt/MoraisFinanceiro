import { handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { getDriverProfile, serializeDriverProfile, upsertDriverProfile } from "@/services/driver-profile-service";

export async function GET() {
  try {
    return ok(serializeDriverProfile(await getDriverProfile(await requireUserId())));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const profile = await upsertDriverProfile(await requireUserId(), await request.json());
    return ok(serializeDriverProfile(profile));
  } catch (error) {
    return handleApiError(error);
  }
}
