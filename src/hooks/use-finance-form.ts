"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form";
import type { z } from "zod";

export function useFinanceForm<TInput extends FieldValues, TOutput extends FieldValues>(
  schema: z.ZodType<TOutput>,
  defaultValues?: DefaultValues<TInput>,
) {
  const typedSchema = schema as unknown as Parameters<typeof zodResolver>[0];
  const resolver = zodResolver(typedSchema) as Resolver<TInput, unknown, TOutput>;

  return useForm<TInput, unknown, TOutput>({
    resolver,
    defaultValues,
    mode: "onBlur",
  });
}
