import { created, handleApiError, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { personalDebtService, serializePersonalDebt } from "@/services/personal-debt-service";

export async function GET() {
  try {
    const items = await personalDebtService.list(await requireUserId());
    return ok(items.map((item) => serializePersonalDebt(item)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const item = await personalDebtService.create(await requireUserId(), await request.json());
    return created(serializePersonalDebt(item));
  } catch (error) {
    return handleApiError(error);
  }
}
