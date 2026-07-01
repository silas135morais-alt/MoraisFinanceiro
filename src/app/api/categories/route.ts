import { handleApiError, created, ok } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth-guard";
import { categoryService } from "@/services/category-service";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const type = new URL(request.url).searchParams.get("type") as "INCOME" | "EXPENSE" | "INVESTMENT" | null;
    return ok(await categoryService.list(userId, type ?? undefined));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    return created(await categoryService.create(userId, await request.json()));
  } catch (error) {
    return handleApiError(error);
  }
}
