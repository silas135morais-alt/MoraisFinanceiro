import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { UnauthorizedError } from "@/lib/auth-guard";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Dados inválidos.", issues: error.flatten() }, { status: 422 });
  }

  if (error instanceof Error) {
    const status = error.message.includes("não encontrado") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ error: "Erro inesperado." }, { status: 500 });
}
