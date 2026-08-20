import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { QuickAddModal } from "@/components/shared/quick-add-modal";
import { prisma } from "@/lib/prisma";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { ensureUserWorkspace } from "@/services/workspace-service";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  await ensureUserWorkspace(session.user.id);
  const [accounts, incomeCategories, expenseCategories, cards] = await Promise.all([
    accountService.listWithBalances(session.user.id),
    categoryService.list(session.user.id, "INCOME"),
    categoryService.list(session.user.id, "EXPENSE"),
    prisma.creditCard.findMany({ where: { userId: session.user.id, isArchived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar user={session.user} />
      <div className="min-h-screen lg:pl-72">
        <AppHeader user={session.user} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <QuickAddModal
          accounts={accounts.map((account) => ({ id: account.id, name: account.name }))}
          incomeCategories={incomeCategories.map((category) => ({ id: category.id, name: category.name }))}
          expenseCategories={expenseCategories.map((category) => ({ id: category.id, name: category.name }))}
          cards={cards}
        />
      </div>
    </div>
  );
}
