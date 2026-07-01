import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Morais Financeiro</p>
          <h1 className="text-2xl font-semibold tracking-normal">Acesse sua conta</h1>
          <p className="text-sm text-muted-foreground">
            Entre com Google para continuar no ambiente protegido.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/app" });
          }}
        >
          <Button className="w-full" type="submit">
            Entrar com Google
          </Button>
        </form>
      </section>
    </main>
  );
}
