-- Future occurrences of recurring income/expense series must not inherit PAID
-- from the first occurrence. Reclassify existing contaminated records and their
-- consolidated transactions so account balances stop including future movements.

UPDATE "Expense"
SET "status" = 'PENDING'
WHERE "status" = 'PAID'
  AND "recurringTransactionId" IS NOT NULL
  AND COALESCE("dueDate", "date") > CURRENT_TIMESTAMP;

UPDATE "Income"
SET "status" = 'PENDING'
WHERE "status" = 'PAID'
  AND "recurringTransactionId" IS NOT NULL
  AND "date" > CURRENT_TIMESTAMP;

UPDATE "Transaction" AS t
SET "status" = 'PENDING',
    "paidAt" = NULL
WHERE t."status" = 'PAID'
  AND t."sourceType" = 'Expense'
  AND EXISTS (
    SELECT 1
    FROM "Expense" AS e
    WHERE e."id" = t."sourceId"
      AND e."recurringTransactionId" IS NOT NULL
      AND COALESCE(e."dueDate", e."date") > CURRENT_TIMESTAMP
      AND e."status" = 'PENDING'
  );

UPDATE "Transaction" AS t
SET "status" = 'PENDING',
    "paidAt" = NULL
WHERE t."status" = 'PAID'
  AND t."sourceType" = 'Income'
  AND EXISTS (
    SELECT 1
    FROM "Income" AS i
    WHERE i."id" = t."sourceId"
      AND i."recurringTransactionId" IS NOT NULL
      AND i."date" > CURRENT_TIMESTAMP
      AND i."status" = 'PENDING'
  );
