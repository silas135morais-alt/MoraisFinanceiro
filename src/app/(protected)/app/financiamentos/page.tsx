import { FinancingActions } from "./financing-actions";

import { requireUserId } from "@/lib/auth-guard";
import { accountService } from "@/services/account-service";
import { categoryService } from "@/services/category-service";
import { financingService } from "@/services/financing-service";

export default async function FinanciamentosPage() {
  const userId = await requireUserId();
  const [accounts, categories, financings] = await Promise.all([
    accountService.list(userId),
    categoryService.list(userId, "EXPENSE"),
    financingService.list(userId),
  ]);

  const accountOptions = accounts.map((account) => ({ id: account.id, name: account.name }));
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));
  const financingRows = financings.map((financing) => ({
    id: financing.id,
    name: financing.name,
    categoryId: financing.categoryId,
    accountId: financing.accountId,
    financedAmount: financing.financedAmount.toNumber(),
    interestRate: financing.interestRate.toNumber(),
    installments: financing.installments,
    currentInstallment: financing.currentInstallment,
    outstandingBalance: financing.outstandingBalance.toNumber(),
    installmentAmount: financing.installmentAmount.toNumber(),
    nextDueDate: financing.nextDueDate.toISOString().slice(0, 10),
    status: financing.status,
  }));

  return <FinancingActions accounts={accountOptions} categories={categoryOptions} financings={financingRows} showList />;
}
