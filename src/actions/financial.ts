'use server';

import { db } from '@/lib/db';
import {
  financialTransactions,
  financialCategories,
  monthlyBalances,
  funds,
  fundContributions,
  orders,
  affiliateCommissions,
} from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql, sum, count } from 'drizzle-orm';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type {
  FinancialTransaction,
  FinancialCategory,
  MonthlyBalance,
  Fund,
  FundContribution,
  DashboardSummary,
  PaymentMethodStats,
  CategoryStats,
  TopExpenses,
  StoreIncome,
} from '@/types/financial';

// Timezone de Brasília
const BRAZIL_TZ = 'America/Sao_Paulo';

// ============================================================================
// CATEGORIAS
// ============================================================================

export async function getCategories(filters?: { type?: string; scope?: string; active?: boolean }) {
  const conditions = [];

  if (filters?.type) {
    conditions.push(eq(financialCategories.type, filters.type));
  }
  if (filters?.scope) {
    conditions.push(eq(financialCategories.scope, filters.scope));
  }
  if (filters?.active !== undefined) {
    conditions.push(eq(financialCategories.active, filters.active));
  }

  return await db.query.financialCategories.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [financialCategories.displayOrder, financialCategories.name],
  });
}

export async function createCategory(data: Omit<FinancialCategory, 'id'>) {
  const [category] = await db.insert(financialCategories).values(data).returning();
  return category;
}

export async function updateCategory(id: string, data: Partial<FinancialCategory>) {
  const [category] = await db
    .update(financialCategories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(financialCategories.id, id))
    .returning();
  return category;
}

export async function deleteCategory(id: string) {
  await db.delete(financialCategories).where(eq(financialCategories.id, id));
}

// ============================================================================
// TRANSAÇÕES
// ============================================================================

export async function getTransactions(filters?: {
  month?: string;
  type?: string;
  scope?: string;
  expenseKind?: string;
  paid?: boolean;
  categoryId?: string;
}) {
  const conditions = [];

  if (filters?.month) {
    const [year, month] = filters.month.split('-');

    // Criar datas no timezone de Brasília
    const startLocalDate = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0);
    const endLocalDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    // Converter para UTC considerando timezone de Brasília
    const startDate = fromZonedTime(startLocalDate, BRAZIL_TZ);
    const endDate = fromZonedTime(endLocalDate, BRAZIL_TZ);

    conditions.push(gte(financialTransactions.date, startDate));
    conditions.push(lte(financialTransactions.date, endDate));
  }

  if (filters?.type) {
    conditions.push(eq(financialTransactions.type, filters.type));
  }
  if (filters?.scope) {
    conditions.push(eq(financialTransactions.scope, filters.scope));
  }
  if (filters?.expenseKind) {
    conditions.push(eq(financialTransactions.expenseKind, filters.expenseKind));
  }
  if (filters?.paid !== undefined) {
    conditions.push(eq(financialTransactions.paid, filters.paid));
  }
  if (filters?.categoryId) {
    conditions.push(eq(financialTransactions.categoryId, filters.categoryId));
  }

  return await db.query.financialTransactions.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      category: true,
    },
    orderBy: [desc(financialTransactions.date)],
  });
}

export async function createTransaction(data: Omit<FinancialTransaction, 'id'>) {
  const transactionData = {
    ...data,
    date: new Date(data.date),
    amount: data.amount.toString(),
    amountTotal: data.amountTotal ? data.amountTotal.toString() : undefined,
    paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
  };

  const [transaction] = await db
    .insert(financialTransactions)
    .values(transactionData as any)
    .returning();
  return transaction;
}

export async function createInstallmentTransactions(data: {
  baseTransaction: Omit<FinancialTransaction, 'id'>;
  installments: number;
}) {
  const { baseTransaction, installments } = data;
  const transactions = [];

  for (let i = 1; i <= installments; i++) {
    const date = new Date(baseTransaction.date);
    date.setMonth(date.getMonth() + (i - 1));

    const amountValue = baseTransaction.amountMonthly || baseTransaction.amount;

    transactions.push({
      ...baseTransaction,
      date,
      installmentNumber: i,
      installmentsTotal: installments,
      amount: amountValue,
      amountMonthly: baseTransaction.amountMonthly,
      amountTotal: baseTransaction.amountTotal,
    });
  }

  return await db
    .insert(financialTransactions)
    .values(transactions as any)
    .returning();
}

export async function updateTransaction(id: string, data: Partial<FinancialTransaction>) {
  const updateData = {
    ...data,
    updatedAt: new Date(),
    date: data.date ? new Date(data.date) : undefined,
    paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
  };

  const [transaction] = await db
    .update(financialTransactions)
    .set(updateData as any)
    .where(eq(financialTransactions.id, id))
    .returning();
  return transaction;
}

export async function markTransactionAsPaid(id: string, paid: boolean = true) {
  const updateData = {
    paid,
    paidAt: paid ? new Date() : null,
    updatedAt: new Date(),
  };

  const [transaction] = await db
    .update(financialTransactions)
    .set(updateData)
    .where(eq(financialTransactions.id, id))
    .returning();
  return transaction;
}

export async function deleteTransaction(id: string) {
  await db.delete(financialTransactions).where(eq(financialTransactions.id, id));
}

// ============================================================================
// SALDO MENSAL
// ============================================================================

export async function getMonthlyBalance(month: string) {
  return await db.query.monthlyBalances.findFirst({
    where: eq(monthlyBalances.month, month),
  });
}

export async function upsertMonthlyBalance(data: Omit<MonthlyBalance, 'id'>) {
  const existing = await getMonthlyBalance(data.month);

  if (existing) {
    const [balance] = await db
      .update(monthlyBalances)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(monthlyBalances.month, data.month))
      .returning();
    return balance;
  } else {
    const [balance] = await db
      .insert(monthlyBalances)
      .values(data as any)
      .returning();
    return balance;
  }
}

// ============================================================================
// FUNDOS
// ============================================================================

export async function getFunds(filters?: { fundType?: string; active?: boolean }) {
  const conditions = [];

  if (filters?.fundType) {
    conditions.push(eq(funds.fundType, filters.fundType));
  }
  if (filters?.active !== undefined) {
    conditions.push(eq(funds.active, filters.active));
  }

  return await db.query.funds.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      category: true,
      contributions: {
        orderBy: [desc(fundContributions.month)],
      },
    },
    orderBy: [desc(funds.createdAt)],
  });
}

export async function createFund(data: Omit<Fund, 'id'>) {
  const fundData = {
    ...data,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  };

  const [fund] = await db
    .insert(funds)
    .values(fundData as any)
    .returning();
  return fund;
}

export async function updateFund(id: string, data: Partial<Fund>) {
  const updateData = {
    ...data,
    updatedAt: new Date(),
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  };

  const [fund] = await db
    .update(funds)
    .set(updateData as any)
    .where(eq(funds.id, id))
    .returning();
  return fund;
}

export async function deleteFund(id: string) {
  await db.delete(funds).where(eq(funds.id, id));
}

// ============================================================================
// CONTRIBUIÇÕES DE FUNDOS
// ============================================================================

export async function getFundContributions(fundId: string) {
  return await db.query.fundContributions.findMany({
    where: eq(fundContributions.fundId, fundId),
    orderBy: [desc(fundContributions.month)],
  });
}

export async function upsertFundContribution(data: Omit<FundContribution, 'id'>) {
  const existing = await db.query.fundContributions.findFirst({
    where: and(eq(fundContributions.fundId, data.fundId), eq(fundContributions.month, data.month)),
  });

  const contributionData = {
    ...data,
    savedAt: data.saved && data.savedAt ? new Date(data.savedAt) : undefined,
  };

  if (existing) {
    const [contribution] = await db
      .update(fundContributions)
      .set({ ...contributionData, updatedAt: new Date() } as any)
      .where(eq(fundContributions.id, existing.id))
      .returning();
    return contribution;
  } else {
    const [contribution] = await db
      .insert(fundContributions)
      .values(contributionData as any)
      .returning();
    return contribution;
  }
}

export async function markContributionAsSaved(
  fundId: string,
  month: string,
  saved: boolean = true,
  amount?: number
) {
  const existing = await db.query.fundContributions.findFirst({
    where: and(eq(fundContributions.fundId, fundId), eq(fundContributions.month, month)),
  });

  if (!existing) {
    throw new Error('Contribuição não encontrada');
  }

  const updateData = {
    saved,
    savedAmount: amount || existing.expectedAmount,
    savedAt: saved ? new Date() : null,
    updatedAt: new Date(),
  };

  const [contribution] = await db
    .update(fundContributions)
    .set(updateData as any)
    .where(eq(fundContributions.id, existing.id))
    .returning();
  return contribution;
}

// ============================================================================
// DASHBOARD & RELATÓRIOS
// ============================================================================

// Taxas de conversão (mesmas usadas em /admin)
const EXCHANGE_RATES: Record<string, number> = {
  BRL: 1,
  USD: 5.65,
  EUR: 6.1,
  MXN: 0.29,
};

function convertToBRL(amount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1;
  return amount * rate;
}

export async function getDashboardSummary(month: string): Promise<DashboardSummary> {
  const [year, monthNum] = month.split('-');

  // Criar datas no timezone de Brasília
  const startLocalDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
  const endLocalDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

  // Converter para UTC considerando timezone de Brasília
  const startDate = fromZonedTime(startLocalDate, BRAZIL_TZ);
  const endDate = fromZonedTime(endLocalDate, BRAZIL_TZ);

  // Buscar saldo inicial
  const balance = await getMonthlyBalance(month);
  const openingBalance = balance?.openingBalance ? parseFloat(balance.openingBalance) : 0;

  // Buscar vendas (orders) do mês - buscar createdAt completo para converter timezone
  const ordersData = await db
    .select({
      createdAt: orders.createdAt,
      total: orders.total,
      currency: orders.currency,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'completed'),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      )
    );

  // Buscar transações manuais do mês
  const transactions = await db.query.financialTransactions.findMany({
    where: and(
      gte(financialTransactions.date, startDate),
      lte(financialTransactions.date, endDate)
    ),
  });

  // Calcular totais
  let totalIncome = 0;
  let totalExpense = 0;
  let storeExpenses = 0;
  let personalExpenses = 0;

  const dailyFlowMap = new Map<string, { income: number; expense: number }>();

  // Adicionar vendas ao totalIncome e dailyFlow (COM CONVERSÃO DE MOEDA E TIMEZONE)
  ordersData.forEach(order => {
    // Converter data UTC para timezone de Brasília
    const localDate = toZonedTime(order.createdAt, BRAZIL_TZ);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const amount = parseFloat(order.total);
    const currency = order.currency || 'BRL';
    const amountBRL = convertToBRL(amount, currency);

    totalIncome += amountBRL;

    if (!dailyFlowMap.has(dateKey)) {
      dailyFlowMap.set(dateKey, { income: 0, expense: 0 });
    }
    dailyFlowMap.get(dateKey)!.income += amountBRL;
  });

  // Adicionar transações manuais
  transactions.forEach(t => {
    // Converter data para timezone de Brasília
    const localDate = toZonedTime(t.date, BRAZIL_TZ);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const amount = parseFloat(t.amount);

    if (!dailyFlowMap.has(dateKey)) {
      dailyFlowMap.set(dateKey, { income: 0, expense: 0 });
    }

    if (t.type === 'INCOME') {
      totalIncome += amount;
      dailyFlowMap.get(dateKey)!.income += amount;
    } else if (t.type === 'EXPENSE') {
      totalExpense += amount;
      dailyFlowMap.get(dateKey)!.expense += amount;

      if (t.scope === 'STORE') {
        storeExpenses += amount;
      } else if (t.scope === 'PERSONAL') {
        personalExpenses += amount;
      }
    }
  });

  // Criar fluxo diário ordenado
  const dailyFlow = Array.from(dailyFlowMap.entries())
    .map(([date, { income, expense }]) => {
      const runningBalance = openingBalance + income - expense;
      return { date, income, expense, balance: runningBalance };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calcular saldo acumulado corretamente
  let currentBalance = openingBalance;
  dailyFlow.forEach(day => {
    currentBalance += day.income - day.expense;
    day.balance = currentBalance;
  });

  return {
    month,
    openingBalance,
    totalIncome,
    totalExpense,
    currentBalance: openingBalance + totalIncome - totalExpense,
    storeExpenses,
    personalExpenses,
    dailyFlow,
  };
}

export async function getStoreIncome(month: string): Promise<StoreIncome[]> {
  const [year, monthNum] = month.split('-');

  // Criar datas no timezone de Brasília
  const startLocalDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
  const endLocalDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

  // Converter para UTC considerando timezone de Brasília
  const startDate = fromZonedTime(startLocalDate, BRAZIL_TZ);
  const endDate = fromZonedTime(endLocalDate, BRAZIL_TZ);

  // Buscar vendas (orders) do mês - buscar todas colunas para converter timezone corretamente
  const ordersData = await db
    .select({
      createdAt: orders.createdAt,
      total: orders.total,
      currency: orders.currency,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'completed'),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      )
    );

  // Agrupar por data (convertendo para timezone de Brasília) e somar valores convertidos em BRL
  const dailyMap = new Map<string, { orderCount: number; amount: number }>();

  ordersData.forEach(order => {
    // Converter data UTC para timezone de Brasília
    const localDate = toZonedTime(order.createdAt, BRAZIL_TZ);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const amount = parseFloat(order.total);
    const currency = order.currency || 'BRL';
    const amountBRL = convertToBRL(amount, currency);

    const existing = dailyMap.get(dateKey) || { orderCount: 0, amount: 0 };
    existing.orderCount++;
    existing.amount += amountBRL;
    dailyMap.set(dateKey, existing);
  });

  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      source: 'orders',
      orderCount: data.orderCount,
      amount: data.amount,
      currency: 'BRL', // Sempre BRL após conversão
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getPaymentMethodStats(month: string): Promise<PaymentMethodStats[]> {
  const [year, monthNum] = month.split('-');

  // Criar datas no timezone de Brasília
  const startLocalDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
  const endLocalDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

  // Converter para UTC considerando timezone de Brasília
  const startDate = fromZonedTime(startLocalDate, BRAZIL_TZ);
  const endDate = fromZonedTime(endLocalDate, BRAZIL_TZ);

  const stats = await db
    .select({
      method: financialTransactions.paymentMethod,
      count: count(financialTransactions.id),
      total: sum(financialTransactions.amount),
    })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.type, 'EXPENSE'),
        gte(financialTransactions.date, startDate),
        lte(financialTransactions.date, endDate)
      )
    )
    .groupBy(financialTransactions.paymentMethod)
    .orderBy(desc(sum(financialTransactions.amount)));

  const totalAmount = stats.reduce((acc, s) => acc + parseFloat((s.total as string) || '0'), 0);

  return stats
    .filter(s => s.method) // Remove valores null
    .map(s => ({
      method: s.method!,
      count: Number(s.count),
      total: parseFloat(s.total as string),
      percentage: totalAmount > 0 ? (parseFloat(s.total as string) / totalAmount) * 100 : 0,
    }));
}

export async function getCategoryStats(month: string): Promise<CategoryStats[]> {
  const [year, monthNum] = month.split('-');

  // Criar datas no timezone de Brasília
  const startLocalDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
  const endLocalDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

  // Converter para UTC considerando timezone de Brasília
  const startDate = fromZonedTime(startLocalDate, BRAZIL_TZ);
  const endDate = fromZonedTime(endLocalDate, BRAZIL_TZ);

  const stats = await db
    .select({
      categoryId: financialTransactions.categoryId,
      categoryName: financialCategories.name,
      count: count(financialTransactions.id),
      total: sum(financialTransactions.amount),
    })
    .from(financialTransactions)
    .leftJoin(financialCategories, eq(financialTransactions.categoryId, financialCategories.id))
    .where(
      and(
        eq(financialTransactions.type, 'EXPENSE'),
        gte(financialTransactions.date, startDate),
        lte(financialTransactions.date, endDate)
      )
    )
    .groupBy(financialTransactions.categoryId, financialCategories.name)
    .orderBy(desc(sum(financialTransactions.amount)));

  const totalAmount = stats.reduce((acc, s) => acc + parseFloat((s.total as string) || '0'), 0);

  return stats
    .filter(s => s.categoryId)
    .map(s => ({
      categoryId: s.categoryId!,
      categoryName: s.categoryName || 'Sem categoria',
      count: Number(s.count),
      total: parseFloat(s.total as string),
      percentage: totalAmount > 0 ? (parseFloat(s.total as string) / totalAmount) * 100 : 0,
    }));
}

export async function getTopExpenses(month: string, limit: number = 10): Promise<TopExpenses[]> {
  const [year, monthNum] = month.split('-');

  // Criar datas no timezone de Brasília
  const startLocalDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
  const endLocalDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

  // Converter para UTC considerando timezone de Brasília
  const startDate = fromZonedTime(startLocalDate, BRAZIL_TZ);
  const endDate = fromZonedTime(endLocalDate, BRAZIL_TZ);

  const expenses = await db
    .select({
      description: financialTransactions.description,
      categoryName: financialCategories.name,
      count: count(financialTransactions.id),
      amount: sum(financialTransactions.amount),
    })
    .from(financialTransactions)
    .leftJoin(financialCategories, eq(financialTransactions.categoryId, financialCategories.id))
    .where(
      and(
        eq(financialTransactions.type, 'EXPENSE'),
        gte(financialTransactions.date, startDate),
        lte(financialTransactions.date, endDate)
      )
    )
    .groupBy(financialTransactions.description, financialCategories.name)
    .orderBy(desc(sum(financialTransactions.amount)))
    .limit(limit);

  return expenses.map(e => ({
    description: e.description,
    count: Number(e.count),
    amount: parseFloat(e.amount as string),
    categoryName: e.categoryName || undefined,
  }));
}
