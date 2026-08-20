-- CreateEnum
CREATE TYPE "PersonalDebtPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PersonalDebtStatus" AS ENUM ('OPEN', 'PAID', 'CANCELED');

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "planningGroup" TEXT;

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyGrossTarget" DECIMAL(14,2) NOT NULL DEFAULT 250,
    "workDays" INTEGER NOT NULL DEFAULT 26,
    "fuelPercent" DECIMAL(6,2) NOT NULL DEFAULT 25,
    "maintenancePercent" DECIMAL(6,2) NOT NULL DEFAULT 8,
    "emergencyPercent" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "taxPercent" DECIMAL(6,2) NOT NULL DEFAULT 5,
    "debtPercent" DECIMAL(6,2) NOT NULL DEFAULT 15,
    "minimumReserve" DECIMAL(14,2) NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalDebt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditor" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalAmount" DECIMAL(14,2) NOT NULL,
    "outstandingBalance" DECIMAL(14,2) NOT NULL,
    "interestRate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "priority" "PersonalDebtPriority" NOT NULL DEFAULT 'URGENT',
    "status" "PersonalDebtStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalDebt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE INDEX "PersonalDebt_userId_status_priority_idx" ON "PersonalDebt"("userId", "status", "priority");
CREATE INDEX "PersonalDebt_userId_dueDate_idx" ON "PersonalDebt"("userId", "dueDate");

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalDebt" ADD CONSTRAINT "PersonalDebt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
