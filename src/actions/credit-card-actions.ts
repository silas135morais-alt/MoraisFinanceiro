"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-guard";
import { creditCardService } from "@/services/credit-card-service";

export async function createCreditCardAction(payload: unknown) {
  const result = await creditCardService.create(await requireUserId(), payload);
  revalidatePath("/app/cartoes");
  return result;
}

export async function createCreditCardPurchaseAction(payload: unknown) {
  const result = await creditCardService.createPurchase(await requireUserId(), payload);
  revalidatePath("/app");
  revalidatePath("/app/cartoes");
  return result;
}
