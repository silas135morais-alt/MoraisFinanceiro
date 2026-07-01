-- CreateEnum
CREATE TYPE "MonthStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'DANGER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'PAID', 'CLOSED', 'IMPORTED', 'EXPORTED');

-- AlterEnum
ALTER TYPE "RecurrenceFrequency" ADD VALUE IF NOT EXISTS 'BIWEEKLY';

-- AlterTable
ALTER TABLE "Month" ADD COLUMN "status" "MonthStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "closedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Income" ADD COLUMN "recurringTransactionId" TEXT,
ADD COLUMN "recurrenceOccurrenceDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "recurringTransactionId" TEXT,
ADD COLUMN "recurrenceOccurrenceDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CreditCardPurchase" ADD COLUMN "isAnticipated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RecurringTransaction" ADD COLUMN "seriesId" TEXT;
UPDATE "RecurringTransaction" SET "seriesId" = "id" WHERE "seriesId" IS NULL;
ALTER TABLE "RecurringTransaction" ALTER COLUMN "seriesId" SET NOT NULL;

-- CreateTable
CREATE TABLE "MonthClosing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "nextMonthId" TEXT,
    "summary" JSONB NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthClosing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL DEFAULT 'MONTHLY',
    "nextChargeAt" TIMESTAMP(3) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "financedAmount" DECIMAL(14,2) NOT NULL,
    "interestRate" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "installments" INTEGER NOT NULL,
    "currentInstallment" INTEGER NOT NULL DEFAULT 1,
    "outstandingBalance" DECIMAL(14,2) NOT NULL,
    "installmentAmount" DECIMAL(14,2) NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Financing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Income_userId_recurringTransactionId_idx" ON "Income"("userId", "recurringTransactionId");

-- CreateIndex
CREATE INDEX "Expense_userId_recurringTransactionId_idx" ON "Expense"("userId", "recurringTransactionId");

-- CreateIndex
CREATE INDEX "RecurringTransaction_userId_seriesId_idx" ON "RecurringTransaction"("userId", "seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthClosing_userId_monthId_key" ON "MonthClosing"("userId", "monthId");

-- CreateIndex
CREATE INDEX "MonthClosing_userId_confirmedAt_idx" ON "MonthClosing"("userId", "confirmedAt");

-- CreateIndex
CREATE INDEX "Subscription_userId_nextChargeAt_status_idx" ON "Subscription"("userId", "nextChargeAt", "status");

-- CreateIndex
CREATE INDEX "Financing_userId_nextDueDate_status_idx" ON "Financing"("userId", "nextDueDate", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_entity_createdAt_idx" ON "AuditLog"("userId", "entity", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_action_createdAt_idx" ON "AuditLog"("userId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "Month_userId_status_startsAt_idx" ON "Month"("userId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_status_dueDate_idx" ON "Transaction"("userId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthClosing" ADD CONSTRAINT "MonthClosing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthClosing" ADD CONSTRAINT "MonthClosing_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "Month"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financing" ADD CONSTRAINT "Financing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
