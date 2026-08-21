-- AlterTable
ALTER TABLE "PersonalDebt" ADD COLUMN "interestBaseBalance" DECIMAL(14,2);
ALTER TABLE "PersonalDebt" ADD COLUMN "interestStartedAt" TIMESTAMP(3);

-- Existing debts keep their current balance as the initial interest base.
UPDATE "PersonalDebt"
SET "interestBaseBalance" = "outstandingBalance",
    "interestStartedAt" = "updatedAt"
WHERE "interestBaseBalance" IS NULL;
