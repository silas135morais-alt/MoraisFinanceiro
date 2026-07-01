"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-guard";
import { incomeService } from "@/services/income-service";

export async function createIncomeAction(payload: unknown) {
  const result = await incomeService.create(await requireUserId(), payload);
  revalidatePath("/app");
  revalidatePath("/app/receitas");
  return result;
}

export async function updateIncomeAction(id: string, payload: unknown) {
  const result = await incomeService.update(await requireUserId(), id, payload);
  revalidatePath("/app");
  revalidatePath("/app/receitas");
  return result;
}

export async function deleteIncomeAction(id: string) {
  const result = await incomeService.remove(await requireUserId(), id);
  revalidatePath("/app");
  revalidatePath("/app/receitas");
  return result;
}
