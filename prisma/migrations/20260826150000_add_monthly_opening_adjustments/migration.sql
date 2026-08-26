-- Month-scoped opening balance adjustments do not alter FinancialAccount.initialBalance.
CREATE TABLE "MonthlyOpeningAdjustment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "monthId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonthlyOpeningAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlyOpeningAdjustment_userId_monthId_accountId_key"
  ON "MonthlyOpeningAdjustment"("userId", "monthId", "accountId");

CREATE INDEX "MonthlyOpeningAdjustment_userId_monthId_idx"
  ON "MonthlyOpeningAdjustment"("userId", "monthId");

ALTER TABLE "MonthlyOpeningAdjustment"
  ADD CONSTRAINT "MonthlyOpeningAdjustment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonthlyOpeningAdjustment"
  ADD CONSTRAINT "MonthlyOpeningAdjustment_monthId_fkey"
  FOREIGN KEY ("monthId") REFERENCES "Month"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonthlyOpeningAdjustment"
  ADD CONSTRAINT "MonthlyOpeningAdjustment_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
