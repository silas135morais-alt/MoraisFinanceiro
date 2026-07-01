import { auth } from "@/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Sessão inválida ou expirada.");
  }
}

export async function requireUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  return session.user.id;
}
