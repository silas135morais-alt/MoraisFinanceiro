"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-guard";
import { categoryService } from "@/services/category-service";

export async function createCategoryAction(payload: unknown) {
  const result = await categoryService.create(await requireUserId(), payload);
  revalidatePath("/app");
  return result;
}

export async function updateCategoryAction(id: string, payload: unknown) {
  const result = await categoryService.update(await requireUserId(), id, payload);
  revalidatePath("/app");
  return result;
}

export async function deleteCategoryAction(id: string) {
  const result = await categoryService.remove(await requireUserId(), id);
  revalidatePath("/app");
  return result;
}
