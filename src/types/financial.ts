import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export const TransactionScope = {
  STORE: 'STORE',
  PERSONAL: 'PERSONAL',
} as const;

export const TransactionRecurrence = {
  ONE_OFF: 'ONE_OFF',
  MONTHLY: 'MONTHLY',
  ANNUAL: 'ANNUAL',
} as const;

export const ExpenseKind = {
  FIXED: 'FIXED',
  VARIABLE: 'VARIABLE',
  DAILY: 'DAILY',
} as const;

export const PaymentMethod = {
  PIX: 'PIX',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  BOLETO: 'BOLETO',
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  PAYPAL: 'PAYPAL',
  STRIPE: 'STRIPE',
  MERCADOPAGO: 'MERCADOPAGO',
} as const;

export const FundType = {
  ANNUAL_BILL: 'ANNUAL_BILL',
  INVESTMENT: 'INVESTMENT',
} as const;

export const CategoryScope = {
  STORE: 'STORE',
  PERSONAL: 'PERSONAL',
  BOTH: 'BOTH',
} as const;

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const financialCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nome obrigatório').max(100),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
  scope: z.enum([CategoryScope.STORE, CategoryScope.PERSONAL, CategoryScope.BOTH]),
  color: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const financialTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.date(),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
  scope: z.enum([TransactionScope.STORE, TransactionScope.PERSONAL]),
  recurrence: z
    .enum([
      TransactionRecurrence.ONE_OFF,
      TransactionRecurrence.MONTHLY,
      TransactionRecurrence.ANNUAL,
    ])
    .optional(),
  expenseKind: z.enum([ExpenseKind.FIXED, ExpenseKind.VARIABLE, ExpenseKind.DAILY]).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().min(1, 'Descrição obrigatória'),
  paymentMethod: z
    .enum([
      PaymentMethod.PIX,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.BOLETO,
      PaymentMethod.CASH,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.PAYPAL,
      PaymentMethod.STRIPE,
      PaymentMethod.MERCADOPAGO,
    ])
    .optional(),
  installmentsTotal: z.number().int().positive().optional(),
  installmentNumber: z.number().int().positive().optional(),
  amountTotal: z.number().positive().optional(),
  amountMonthly: z.number().positive().optional(),
  amount: z.number().positive(),
  paid: z.boolean().default(false),
  canceledAt: z.date().optional(),
  paidAt: z.date().optional(),
  orderId: z.string().uuid().optional(),
  affiliateCommissionId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const monthlyBalanceSchema = z.object({
  id: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM'),
  openingBalance: z.number().default(0),
  closingBalanceLocked: z.number().optional(),
  locked: z.boolean().default(false),
  notes: z.string().optional(),
});

export const fundSchema = z.object({
  id: z.string().uuid().optional(),
  fundType: z.enum([FundType.ANNUAL_BILL, FundType.INVESTMENT]),
  categoryId: z.string().uuid().optional(),
  title: z.string().min(1, 'Título obrigatório').max(200),
  startDate: z.date(),
  endDate: z.date().optional(),
  totalAmount: z.number().positive(),
  monthlyAmount: z.number().positive(),
  active: z.boolean().default(true),
  notes: z.string().optional(),
});

export const fundContributionSchema = z.object({
  id: z.string().uuid().optional(),
  fundId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM'),
  expectedAmount: z.number().positive(),
  saved: z.boolean().default(false),
  savedAmount: z.number().default(0),
  savedAt: z.date().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// TYPES (inferidos dos schemas)
// ============================================================================

export type FinancialCategory = z.infer<typeof financialCategorySchema>;
export type FinancialTransaction = z.infer<typeof financialTransactionSchema>;
export type MonthlyBalance = z.infer<typeof monthlyBalanceSchema>;
export type Fund = z.infer<typeof fundSchema>;
export type FundContribution = z.infer<typeof fundContributionSchema>;

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardSummary {
  month: string;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  storeExpenses: number;
  personalExpenses: number;
  dailyFlow: Array<{
    date: string;
    income: number;
    expense: number;
    balance: number;
  }>;
}

export interface PaymentMethodStats {
  method: string;
  count: number;
  total: number;
  percentage: number;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
  percentage: number;
}

export interface TopExpenses {
  description: string;
  amount: number;
  count: number;
  categoryName?: string;
}

export interface StoreIncome {
  date: string;
  source: string; // 'orders' | 'other'
  orderCount: number;
  amount: number;
  currency?: string;
}
