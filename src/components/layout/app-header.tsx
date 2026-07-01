import type { Session } from "next-auth";
import { LogOut } from "lucide-react";

import { signOut } from "@/auth";
import { MobileNav, UserAvatar } from "@/components/layout/app-sidebar";
import { MonthSelector } from "@/components/shared/month-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  user: NonNullable<Session["user"]>;
};

export function AppHeader({ user }: AppHeaderProps) {
  const firstName = user.name?.split(" ")[0] ?? "Usuário";

  return (
    <header className="border-b bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              MoraisFinanceiro
            </p>
            <h1 className="truncate text-lg font-semibold tracking-normal sm:text-xl">
              Olá, {firstName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <MonthSelector compact />
            </div>
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border bg-card px-2 py-1.5 transition-colors hover:bg-secondary">
                <UserAvatar name={user.name} image={user.image} />
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-card p-2 shadow-lg">
                <div className="px-2 py-2">
                  <p className="truncate text-sm font-medium">{user.name ?? "Usuário"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="my-1 h-px bg-border" />
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <Button className="w-full justify-start" size="sm" variant="ghost" type="submit">
                    <LogOut className="size-4" />
                    Sair
                  </Button>
                </form>
              </div>
            </details>
          </div>
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
