import { paginationSchema } from "@/validators/finance";

export function parseListQuery(request: Request) {
  return paginationSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
}
