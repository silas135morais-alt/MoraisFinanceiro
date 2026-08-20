-- CreateTable
CREATE TABLE "DriverDailyEarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incomeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverDailyEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverDailyEarning_incomeId_key" ON "DriverDailyEarning"("incomeId");
CREATE UNIQUE INDEX "DriverDailyEarning_userId_date_key" ON "DriverDailyEarning"("userId", "date");
CREATE INDEX "DriverDailyEarning_userId_date_idx" ON "DriverDailyEarning"("userId", "date");

-- AddForeignKey
ALTER TABLE "DriverDailyEarning" ADD CONSTRAINT "DriverDailyEarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverDailyEarning" ADD CONSTRAINT "DriverDailyEarning_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "Income"("id") ON DELETE CASCADE ON UPDATE CASCADE;
