import { z } from "zod";

const dateString = z.string().min(1).transform((value) => new Date(value));
const money = z.coerce.number().positive();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().optional(),
  status: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2),
  type: z.enum(["INCOME", "EXPENSE", "INVESTMENT"]),
  color: z.string().default("#15803d"),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const financialAccountSchema = z.object({
  name: z.string().min(2),
  institution: z.string().optional().nullable(),
  type: z.string().default("CHECKING"),
  color: z.string().default("#15803d"),
  initialBalance: z.coerce.number().default(0),
  isDefault: z.boolean().default(false),
});

export const incomeSchema = z.object({
  title: z.string().min(2),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  amount: money,
  date: dateString,
  description: z.string().optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY").optional(),
  status: z.enum(["PAID", "PENDING", "OVERDUE", "CANCELED"]).default("PENDING"),
});

export const expenseSchema = incomeSchema.extend({
  dueDate: dateString.optional(),
  type: z.enum(["ONE_TIME", "FIXED", "INSTALLMENT", "SUBSCRIPTION", "FINANCING"]).default("ONE_TIME"),
  installments: z.coerce.number().int().positive().max(360).optional(),
  recurrenceFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY").optional(),
});

export const creditCardSchema = z.object({
  bank: z.string().min(2),
  name: z.string().min(2),
  limit: money,
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  color: z.string().default("#111827"),
  brand: z.enum(["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"]).default("OTHER"),
  lastFourDigits: z.string().regex(/^\d{4}$/),
});

export const creditCardPurchaseSchema = z.object({
  cardId: z.string().min(1),
  categoryId: z.string().min(1),
  title: z.string().min(2),
  amount: money,
  date: dateString,
  invoiceDate: dateString.optional(),
  description: z.string().optional().nullable(),
  installments: z.coerce.number().int().positive().max(360).default(1),
  currentInstallment: z.coerce.number().int().positive().max(360).default(1).optional(),
  status: z.enum(["PAID", "PENDING", "OVERDUE", "CANCELED"]).default("PENDING"),
});

export const recurringTransactionSchema = z.object({
  title: z.string().min(2),
  amount: money,
  type: z.enum(["INCOME", "EXPENSE"]),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  startsAt: dateString,
  endsAt: dateString.optional(),
  nextRunAt: dateString,
  categoryId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
});

export const subscriptionSchema = z.object({
  name: z.string().min(2),
  provider: z.string().optional().nullable(),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  amount: money,
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  nextChargeAt: dateString,
  status: z.enum(["PAID", "PENDING", "OVERDUE", "CANCELED"]).default("PENDING"),
});

export const financingSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  financedAmount: money,
  interestRate: z.coerce.number().min(0).default(0),
  installments: z.coerce.number().int().positive().max(600),
  currentInstallment: z.coerce.number().int().positive().default(1),
  outstandingBalance: money,
  installmentAmount: money,
  nextDueDate: dateString,
  status: z.enum(["PAID", "PENDING", "OVERDUE", "CANCELED"]).default("PENDING"),
});

export const monthClosingSchema = z.object({
  monthId: z.string().min(1),
});

export const importSchema = z.object({
  entity: z.enum(["incomes", "expenses"]),
  content: z.string().min(1),
});

export const exportSchema = z.object({
  entity: z.enum(["incomes", "expenses", "cards", "reports"]).default("reports"),
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
});

export const budgetSchema = z.object({
  categoryId: z.string().min(1),
  monthId: z.string().min(1),
  limit: money,
  alertPercent: z.coerce.number().int().min(1).max(100).default(80),
});

export const investmentSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["FIXED_INCOME", "VARIABLE_INCOME", "FUND", "CRYPTO", "RETIREMENT", "OTHER"]),
  institution: z.string().optional().nullable(),
  currentValue: z.coerce.number().default(0),
  targetValue: z.coerce.number().optional().nullable(),
});

export const investmentContributionSchema = z.object({
  investmentId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  amount: money,
  date: dateString,
  description: z.string().optional().nullable(),
});

export const assetSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["REAL_ESTATE", "VEHICLE", "CASH", "BUSINESS", "OTHER"]),
  value: money,
  acquiredAt: dateString.optional(),
  description: z.string().optional().nullable(),
});

export type IncomeInput = z.infer<typeof incomeSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type CreditCardInput = z.infer<typeof creditCardSchema>;
