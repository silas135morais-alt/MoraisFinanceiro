-- Add real fuel cost tracking to daily driver earnings.
ALTER TABLE "DriverDailyEarning"
  ADD COLUMN "fuelAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "fuelExpenseId" TEXT;

CREATE UNIQUE INDEX "DriverDailyEarning_fuelExpenseId_key"
  ON "DriverDailyEarning"("fuelExpenseId");

ALTER TABLE "DriverDailyEarning"
  ADD CONSTRAINT "DriverDailyEarning_fuelExpenseId_fkey"
  FOREIGN KEY ("fuelExpenseId") REFERENCES "Expense"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
