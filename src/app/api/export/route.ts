import { requireUserId } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-response";
import { exportData } from "@/services/export-service";
import { exportSchema } from "@/validators/finance";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { entity, format } = exportSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const file = await exportData(await requireUserId(), entity, format);
    const body = typeof file.body === "string" ? file.body : new Uint8Array(file.body);

    return new Response(body, {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
