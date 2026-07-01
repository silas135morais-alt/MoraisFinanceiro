import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ensureUserWorkspace } from "@/services/workspace-service";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  await ensureUserWorkspace(session.user.id);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar user={session.user} />
      <div className="min-h-screen lg:pl-72">
        <AppHeader user={session.user} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
