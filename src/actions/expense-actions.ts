"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-guard";
import { expenseService } from "@/services/expense-service";

export async function createExpenseAction(payload: unknown) {
  const result = await expenseService.create(await requireUserId(), payload);
  revalidatePath("/app");
  revalidatePath("/app/despesas");
  return result;
}

export async function updateExpenseAction(id: string, payload: unknown) {
  const result = await expenseService.update(await requireUserId(), id, payload);
  revalidatePath("/app");
  revalidatePath("/app/despesas");
  return result;
}

export async function deleteExpenseAction(id: string) {
  const result = await expenseService.remove(await requireUserId(), id);
  revalidatePath("/app");
  revalidatePath("/app/despesas");
  return result;
}
