'use server';

import { db } from '@/lib/db';
import {
  financialTransactions,
  financialCategories,
  monthlyBalances,
  funds,
  fundContributions,
  orders,
} from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sum, count, isNull, isNotNull, like, inArray } from 'drizzle-orm';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { revalidatePath } from 'next/cache';
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

/**
 * Converte uma data string (YYYY-MM-DD) ou Date para o timezone de Brasília
 * Isso evita o problema de datas voltarem um dia ao criar Date com string
 */
function parseDateInBrazilTZ(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }

  // Se é string no formato YYYY-MM-DD, criar data ao meio-dia no timezone de Brasília
  if (typeof dateInput === 'string') {
    const [year, month, day] = dateInput.split('T')[0].split('-').map(Number);
    // Criar data local ao meio-dia para evitar problemas de timezone
    const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    // Converter para UTC mantendo o dia correto no timezone de Brasília
    return fromZonedTime(localDate, BRAZIL_TZ);
  }

  return new Date(dateInput);
}

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
  // Validação: garantir que amount existe
  if (!data.amount && data.amount !== 0) {
    throw new Error('Valor da transação é obrigatório');
  }

  const transactionData = {
    ...data,
    date: parseDateInBrazilTZ(data.date),
    amount: data.amount.toString(),
    amountTotal: data.amountTotal ? data.amountTotal.toString() : undefined,
    amountMonthly: data.amountMonthly ? data.amountMonthly.toString() : undefined,
    paidAt: data.paidAt ? parseDateInBrazilTZ(data.paidAt) : undefined,
  };

  const [transaction] = await db.insert(financialTransactions).values(transactionData).returning();
  return transaction;
}

export async function createInstallmentTransactions(data: {
  baseTransaction: Omit<FinancialTransaction, 'id'>;
  installments: number;
}) {
  const { baseTransaction, installments } = data;

  // 🛡️ VALIDAÇÃO: Verificar se já existem parcelas similares
  const existingSimilar = await db.query.financialTransactions.findMany({
    where: and(
      eq(financialTransactions.description, baseTransaction.description),
      eq(financialTransactions.scope, baseTransaction.scope),
      eq(financialTransactions.type, baseTransaction.type),
      isNull(financialTransactions.recurrence) // Parcelas não têm recurrence ou é ONE_OFF
    ),
    limit: 1,
  });

  if (existingSimilar.length > 0 && existingSimilar[0].installmentsTotal === installments) {
    throw new Error(
      `⚠️ Já existem parcelas com essa descrição! Se quiser criar novamente, altere a descrição ou delete as parcelas antigas primeiro.`
    );
  }

  const transactions = [];

  for (let i = 1; i <= installments; i++) {
    const date = parseDateInBrazilTZ(baseTransaction.date);
    date.setMonth(date.getMonth() + (i - 1));

    const amountValue = baseTransaction.amountMonthly || baseTransaction.amount;

    transactions.push({
      id: crypto.randomUUID(),
      type: baseTransaction.type,
      scope: baseTransaction.scope,
      expenseKind: baseTransaction.expenseKind,
      incomeKind: 'incomeKind' in baseTransaction ? baseTransaction.incomeKind : undefined,
      description: baseTransaction.description,
      date,
      installmentNumber: i,
      installmentsTotal: installments,
      amount: typeof amountValue === 'number' ? amountValue.toString() : amountValue,
      amountMonthly: baseTransaction.amountMonthly
        ? typeof baseTransaction.amountMonthly === 'number'
          ? baseTransaction.amountMonthly.toString()
          : baseTransaction.amountMonthly
        : undefined,
      amountTotal: baseTransaction.amountTotal
        ? typeof baseTransaction.amountTotal === 'number'
          ? baseTransaction.amountTotal.toString()
          : baseTransaction.amountTotal
        : undefined,
      recurrence: 'ONE_OFF' as const, // 🔥 IMPORTANTE: Marcar explicitamente como ONE_OFF
      paid: baseTransaction.paid,
      paidAt: baseTransaction.paidAt,
      categoryId: baseTransaction.categoryId,
      paymentMethod: baseTransaction.paymentMethod,
      notes: baseTransaction.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return await db.insert(financialTransactions).values(transactions).returning();
}

export async function createRecurringTransactions(data: {
  baseTransaction: Omit<FinancialTransaction, 'id'>;
  months: number; // Quantos meses à frente criar
  startIndex?: number; // Índice inicial (padrão: 0). Use 1 para pular a primeira ocorrência
}) {
  const { baseTransaction, months, startIndex = 0 } = data;
  const transactions = [];

  // VALIDAÇÃO: Transações recorrentes SEMPRE devem ter expenseKind='FIXED'
  const validatedTransaction = {
    ...baseTransaction,
    expenseKind:
      baseTransaction.type === 'EXPENSE' ? ('FIXED' as const) : baseTransaction.expenseKind,
  };

  // Parseia a data base UMA VEZ, fora do loop
  const baseDate = parseDateInBrazilTZ(validatedTransaction.date);

  for (let i = startIndex; i < months; i++) {
    // Cria nova data a partir da base para cada iteração
    const date = new Date(baseDate);

    if (validatedTransaction.recurrence === 'MONTHLY') {
      date.setMonth(date.getMonth() + i);
    } else if (validatedTransaction.recurrence === 'QUARTERLY') {
      date.setMonth(date.getMonth() + i * 3);
    } else if (validatedTransaction.recurrence === 'SEMIANNUAL') {
      date.setMonth(date.getMonth() + i * 6);
    } else if (validatedTransaction.recurrence === 'ANNUAL') {
      date.setFullYear(date.getFullYear() + i);
    }

    transactions.push({
      id: crypto.randomUUID(),
      type: validatedTransaction.type,
      scope: validatedTransaction.scope,
      expenseKind: validatedTransaction.expenseKind,
      description: validatedTransaction.description,
      date,
      recurrence: validatedTransaction.recurrence,
      amount:
        typeof validatedTransaction.amount === 'number'
          ? validatedTransaction.amount.toString()
          : validatedTransaction.amount,
      amountMonthly: validatedTransaction.amountMonthly
        ? typeof validatedTransaction.amountMonthly === 'number'
          ? validatedTransaction.amountMonthly.toString()
          : validatedTransaction.amountMonthly
        : undefined,
      amountTotal: validatedTransaction.amountTotal
        ? typeof validatedTransaction.amountTotal === 'number'
          ? validatedTransaction.amountTotal.toString()
          : validatedTransaction.amountTotal
        : undefined,
      // Apenas a PRIMEIRA ocorrência (i===0) mantém o status "pago" original
      // As futuras sempre começam como "não pago"
      paid: i === 0 ? validatedTransaction.paid : false,
      paidAt: i === 0 ? validatedTransaction.paidAt : undefined,
      categoryId: validatedTransaction.categoryId,
      paymentMethod: validatedTransaction.paymentMethod,
      notes: validatedTransaction.notes,
      installmentNumber: undefined,
      installmentsTotal: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const inserted = await db.insert(financialTransactions).values(transactions).returning();

  return inserted;
}

export async function updateTransaction(id: string, data: Partial<FinancialTransaction>) {
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date(),
    // Limpar cancelamento ao editar a transação
    canceledAt: null,
  };

  if (data.date) {
    updateData.date = parseDateInBrazilTZ(data.date);
  }
  if (data.paidAt) {
    updateData.paidAt = parseDateInBrazilTZ(data.paidAt);
  }
  if (data.amount !== undefined) {
    updateData.amount = data.amount.toString();
  }
  if (data.amountMonthly !== undefined) {
    updateData.amountMonthly = data.amountMonthly ? data.amountMonthly.toString() : null;
  }
  if (data.amountTotal !== undefined) {
    updateData.amountTotal = data.amountTotal ? data.amountTotal.toString() : null;
  }

  const [transaction] = await db
    .update(financialTransactions)
    .set(updateData)
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

export async function cancelRecurrence(id: string) {
  // Busca a transação original
  const original = await db.query.financialTransactions.findFirst({
    where: eq(financialTransactions.id, id),
  });

  if (!original || !original.recurrence || original.recurrence === 'ONE_OFF') {
    throw new Error('Transação não é recorrente');
  }

  // Cancela apenas as transações FUTURAS com mesmas características
  const conditions = [
    eq(financialTransactions.description, original.description),
    eq(financialTransactions.amount, original.amount),
    eq(financialTransactions.recurrence, original.recurrence),
    eq(financialTransactions.scope, original.scope), // Mesmo escopo (STORE/PERSONAL)
    eq(financialTransactions.type, original.type), // Mesmo tipo (INCOME/EXPENSE)
    gte(financialTransactions.date, original.date), // A partir da data desta transação
    isNull(financialTransactions.canceledAt), // Que ainda não foram canceladas
  ];

  // Adiciona condição de expenseKind se existir
  if (original.expenseKind) {
    conditions.push(eq(financialTransactions.expenseKind, original.expenseKind));
  }

  // Adiciona condição de categoryId se não for null
  if (original.categoryId) {
    conditions.push(eq(financialTransactions.categoryId, original.categoryId));
  } else {
    conditions.push(isNull(financialTransactions.categoryId));
  }

  const result = await db
    .update(financialTransactions)
    .set({
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning();

  return result;
}

export async function reactivateRecurrence(id: string) {
  // Busca a transação original
  const original = await db.query.financialTransactions.findFirst({
    where: eq(financialTransactions.id, id),
  });

  if (!original || !original.recurrence || original.recurrence === 'ONE_OFF') {
    throw new Error('Transação não é recorrente');
  }

  // Reativa as transações FUTURAS com mesmas características
  const conditions = [
    eq(financialTransactions.description, original.description),
    eq(financialTransactions.amount, original.amount),
    eq(financialTransactions.recurrence, original.recurrence),
    eq(financialTransactions.scope, original.scope), // Mesmo escopo (STORE/PERSONAL)
    eq(financialTransactions.type, original.type), // Mesmo tipo (INCOME/EXPENSE)
    gte(financialTransactions.date, original.date),
    isNotNull(financialTransactions.canceledAt), // Apenas as canceladas
  ];

  // Adiciona condição de expenseKind se existir
  if (original.expenseKind) {
    conditions.push(eq(financialTransactions.expenseKind, original.expenseKind));
  }

  if (original.categoryId) {
    conditions.push(eq(financialTransactions.categoryId, original.categoryId));
  } else {
    conditions.push(isNull(financialTransactions.categoryId));
  }

  const result = await db
    .update(financialTransactions)
    .set({
      canceledAt: null,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning();

  return result;
}

export async function deleteTransaction(id: string) {
  // Busca a transação original
  const original = await db.query.financialTransactions.findFirst({
    where: eq(financialTransactions.id, id),
  });

  if (!original) {
    throw new Error('Transação não encontrada');
  }

  // Se for recorrente, apaga apenas as FUTURAS (mantém anteriores)
  if (original.recurrence && original.recurrence !== 'ONE_OFF') {
    const conditions = [
      eq(financialTransactions.description, original.description),
      eq(financialTransactions.amount, original.amount),
      eq(financialTransactions.recurrence, original.recurrence),
      gte(financialTransactions.date, original.date), // A partir desta transação (incluindo ela)
    ];

    // Adiciona condição de categoryId se não for null
    if (original.categoryId) {
      conditions.push(eq(financialTransactions.categoryId, original.categoryId));
    } else {
      conditions.push(isNull(financialTransactions.categoryId));
    }

    await db.delete(financialTransactions).where(and(...conditions));
  } else {
    // Se não for recorrente, apaga apenas a atual
    await db.delete(financialTransactions).where(eq(financialTransactions.id, id));
  }
}

/**
 * Ajusta o número de parcelas de uma transação e atualiza as parcelas subsequentes
 */
export async function adjustInstallmentNumbers(params: {
  transactionId: string;
  newInstallmentNumber: number;
}) {
  const { transactionId, newInstallmentNumber } = params;

  // Busca a transação original
  const original = await db.query.financialTransactions.findFirst({
    where: eq(financialTransactions.id, transactionId),
  });

  if (!original) {
    throw new Error('Transação não encontrada');
  }

  if (!original.installmentsTotal || !original.installmentNumber) {
    throw new Error('Esta transação não é parcelada');
  }

  if (newInstallmentNumber < 1 || newInstallmentNumber > original.installmentsTotal) {
    throw new Error(`Número da parcela deve estar entre 1 e ${original.installmentsTotal}`);
  }

  const difference = newInstallmentNumber - original.installmentNumber;

  // Se não houve mudança, retorna
  if (difference === 0) {
    return { updated: 0 };
  }

  // Atualiza a transação atual
  await db
    .update(financialTransactions)
    .set({
      installmentNumber: newInstallmentNumber,
      updatedAt: new Date(),
    })
    .where(eq(financialTransactions.id, transactionId));

  // Busca todas as parcelas da mesma compra (mesmo description, amountTotal, paymentMethod)
  // que estão depois desta no tempo
  const conditions = [
    eq(financialTransactions.description, original.description),
    eq(financialTransactions.installmentsTotal, original.installmentsTotal),
    gte(financialTransactions.date, original.date),
  ];

  if (original.amountTotal !== null) {
    conditions.push(eq(financialTransactions.amountTotal, original.amountTotal));
  }

  if (original.paymentMethod) {
    conditions.push(eq(financialTransactions.paymentMethod, original.paymentMethod));
  }

  const siblingTransactions = await db.query.financialTransactions.findMany({
    where: and(...conditions),
    orderBy: [financialTransactions.date],
  });

  // Atualiza as parcelas subsequentes
  let updated = 0;
  for (const transaction of siblingTransactions) {
    if (
      transaction.id !== transactionId &&
      transaction.installmentNumber &&
      transaction.installmentNumber > original.installmentNumber
    ) {
      const newNumber = transaction.installmentNumber + difference;

      // Só atualiza se o novo número ainda estiver dentro do range válido
      if (newNumber >= 1 && newNumber <= original.installmentsTotal) {
        await db
          .update(financialTransactions)
          .set({
            installmentNumber: newNumber,
            updatedAt: new Date(),
          })
          .where(eq(financialTransactions.id, transaction.id));
        updated++;
      }
    }
  }

  return { updated: updated + 1 }; // +1 pela transação original
}

/**
 * Detecta e corrige parcelas resetadas ou duplicadas
 */
export async function detectAndFixBrokenInstallments() {
  // Busca todas as transações parceladas agrupadas por descrição
  const allInstallments = await db.query.financialTransactions.findMany({
    where: and(
      // Tem parcelas
      isNull(financialTransactions.canceledAt)
    ),
    orderBy: [financialTransactions.description, financialTransactions.date],
  });

  const grouped = new Map<string, typeof allInstallments>();

  // Agrupa por descrição + amountTotal para identificar a mesma compra
  for (const transaction of allInstallments) {
    if (transaction.installmentsTotal && transaction.installmentNumber) {
      // Usar descrição + total para agrupar (mesmo produto, mesmo valor total)
      const totalStr = transaction.amountTotal?.toString() || transaction.amount?.toString() || '0';
      const key = `${transaction.description}|||${totalStr}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(transaction);
    }
  }

  const problems: Array<{
    description: string;
    issue: string;
    details: string;
    severity: 'error' | 'warning';
    transactions: typeof allInstallments;
  }> = [];

  // Detecta problemas
  for (const [, transactions] of grouped.entries()) {
    if (transactions.length === 0) continue;

    const description = transactions[0].description;
    const installmentsTotal = transactions[0].installmentsTotal!;
    const dates = transactions.map(t => format(new Date(t.date), 'MM/yyyy')).join(', ');

    // Problema 1: Mais parcelas do que deveria ter
    if (transactions.length > installmentsTotal) {
      problems.push({
        description,
        issue: `Tem ${transactions.length} parcelas, mas deveria ter ${installmentsTotal}`,
        details: `Meses: ${dates}. Provavelmente foram criadas duplicadas. Delete ${transactions.length - installmentsTotal} parcelas extras.`,
        severity: 'error',
        transactions,
      });
    }

    // Problema 2: Menos parcelas do que deveria
    if (transactions.length < installmentsTotal) {
      const numbers = transactions.map(t => t.installmentNumber!).sort((a, b) => a - b);
      const missing = [];
      for (let i = 1; i <= installmentsTotal; i++) {
        if (!numbers.includes(i)) {
          missing.push(i);
        }
      }

      problems.push({
        description,
        issue: `Falta${missing.length > 1 ? 'm' : ''} parcela${missing.length > 1 ? 's' : ''} ${missing.join(', ')}/${installmentsTotal}`,
        details: `Tem apenas ${transactions.length} de ${installmentsTotal} parcelas. Faltam: ${missing.join(', ')}. Alguém pode ter deletado por engano.`,
        severity: 'warning',
        transactions,
      });
    }

    // Problema 3: Parcelas resetadas (mais de uma parcela com mesmo número)
    const numberCounts = new Map<number, number>();
    for (const t of transactions) {
      const num = t.installmentNumber!;
      numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
    }

    const duplicates = Array.from(numberCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([num, count]) => `${count}x parcela ${num}/${installmentsTotal}`);

    if (duplicates.length > 0) {
      problems.push({
        description,
        issue: `Tem parcelas duplicadas: ${duplicates.join(', ')}`,
        details: `Resetou a contagem. ${duplicates.join(', ')}. Use o botão de edição (lápis) para corrigir os números.`,
        severity: 'error',
        transactions,
      });
    }

    // Problema 4: Números de parcelas fora de sequência
    const numbers = transactions.map(t => t.installmentNumber!).sort((a, b) => a - b);
    let hasGaps = false;
    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i + 1] - numbers[i] > 1) {
        hasGaps = true;
        break;
      }
    }

    if (hasGaps && transactions.length === installmentsTotal) {
      problems.push({
        description,
        issue: `Números de parcelas pulados`,
        details: `Parcelas existentes: ${numbers.join(', ')}. Reordene os números usando o botão de edição (lápis).`,
        severity: 'warning',
        transactions,
      });
    }
  }

  return problems;
}

/**
 * Corrige automaticamente parcelas duplicadas, mantendo apenas as corretas
 */
export async function autoFixDuplicatedInstallments(description: string, amountTotal?: string) {
  // Busca todas as parcelas dessa compra
  const conditions = [
    eq(financialTransactions.description, description),
    isNull(financialTransactions.canceledAt),
  ];

  // Se amountTotal for fornecido, adicionar como filtro
  if (amountTotal) {
    conditions.push(eq(financialTransactions.amountTotal, amountTotal));
  }

  const transactions = await db.query.financialTransactions.findMany({
    where: and(...conditions),
    orderBy: [financialTransactions.date],
  });

  if (transactions.length === 0) {
    throw new Error('Nenhuma transação encontrada');
  }

  const installmentsTotal = transactions[0].installmentsTotal!;

  // Se tem mais parcelas do que deveria, mantém apenas as primeiras de cada número
  if (transactions.length > installmentsTotal) {
    const kept = new Set<number>();
    const toDelete: string[] = [];

    for (const transaction of transactions) {
      const num = transaction.installmentNumber!;

      if (kept.has(num)) {
        // Já tem uma parcela com esse número, deletar esta
        toDelete.push(transaction.id);
      } else {
        kept.add(num);
      }
    }

    // Deletar duplicatas
    if (toDelete.length > 0) {
      await db.delete(financialTransactions).where(inArray(financialTransactions.id, toDelete));
    }

    return { deleted: toDelete.length };
  }

  return { deleted: 0 };
}

/**
 * Investiga uma série específica de parcelas, mostrando TODAS independente do mês
 */
export async function investigateInstallmentSeries(searchTerm: string) {
  const transactions = await db.query.financialTransactions.findMany({
    where: and(
      like(financialTransactions.description, `%${searchTerm}%`),
      isNull(financialTransactions.canceledAt)
    ),
    orderBy: [financialTransactions.date],
  });

  if (transactions.length === 0) {
    return { found: false, message: 'Nenhuma transação encontrada' };
  }

  // Agrupar por description + amountTotal
  const groups = new Map<string, typeof transactions>();

  for (const t of transactions) {
    const key = `${t.description}|||${t.amountTotal || 0}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(t);
  }

  const results: Array<{
    description: string;
    amountTotal: string;
    installmentsTotal: number;
    found: number;
    expected: number;
    status: string;
    hasResetIssue: boolean;
    hasDuplicates: boolean;
    dates: string[];
    details: Array<{
      installmentNumber: number;
      date: string;
      amount: string;
      paid: boolean;
    }>;
  }> = [];

  for (const [key, items] of groups) {
    const [description, amountStr] = key.split('|||');
    const installments = items.filter(t => t.installmentNumber && t.installmentsTotal);

    if (installments.length > 0) {
      const total = installments[0].installmentsTotal!;
      const numbers = installments.map(t => t.installmentNumber!).sort((a, b) => a - b);
      const dates = installments.map(t => format(new Date(t.date), 'dd/MM/yyyy'));

      // Identificar parcelas faltando
      const missing: number[] = [];
      for (let i = 1; i <= total; i++) {
        if (!numbers.includes(i)) {
          missing.push(i);
        }
      }

      // Identificar duplicatas
      const duplicates: number[] = [];
      const seen = new Set<number>();
      for (const num of numbers) {
        if (seen.has(num)) {
          duplicates.push(num);
        } else {
          seen.add(num);
        }
      }

      results.push({
        description,
        amountTotal: amountStr,
        installmentsTotal: total,
        found: installments.length,
        expected: total,
        status: missing.length > 0 ? 'incomplete' : duplicates.length > 0 ? 'duplicated' : 'ok',
        hasResetIssue: duplicates.length > 0,
        hasDuplicates: duplicates.length > 0,
        dates,
        details: installments.map(t => ({
          installmentNumber: t.installmentNumber!,
          date: format(new Date(t.date), 'dd/MM/yyyy'),
          amount: t.amount,
          paid: t.paid,
        })),
      });
    }
  }

  return { found: true, results };
}

/**
 * Reajusta datas de uma série de parcelas para sequência mensal correta
 * @param description - Descrição da transação
 * @param amountTotal - Valor total (para identificar a série correta)
 * @param startDate - Data de início (primeira parcela) no formato YYYY-MM-DD
 */
export async function reajustInstallmentDates(
  description: string,
  amountTotal: string,
  startDate: string
) {
  // Busca todas as parcelas dessa série
  const transactions = await db.query.financialTransactions.findMany({
    where: and(
      eq(financialTransactions.description, description),
      isNull(financialTransactions.canceledAt)
    ),
    orderBy: [financialTransactions.installmentNumber],
  });

  if (transactions.length === 0) {
    throw new Error('Nenhuma transação encontrada');
  }

  const installments = transactions.filter(t => t.installmentNumber && t.installmentsTotal);

  if (installments.length === 0) {
    throw new Error('Nenhuma parcela encontrada');
  }

  // Parse da data inicial
  const baseDate = parseDateInBrazilTZ(startDate);
  const updates: Array<{ id: string; newDate: Date }> = [];

  // Para cada parcela, calcular a nova data
  for (const transaction of installments) {
    const installmentNum = transaction.installmentNumber!;

    // Adiciona (installmentNum - 1) meses à data base
    const newDate = new Date(baseDate);
    newDate.setMonth(newDate.getMonth() + (installmentNum - 1));

    updates.push({
      id: transaction.id,
      newDate,
    });
  }

  // Aplicar todas as atualizações
  for (const update of updates) {
    await db
      .update(financialTransactions)
      .set({ date: update.newDate })
      .where(eq(financialTransactions.id, update.id));
  }

  revalidatePath('/admin/financeiro');

  return {
    updated: updates.length,
    details: updates.map(u => ({
      id: u.id,
      newDate: format(u.newDate, 'dd/MM/yyyy'),
    })),
  };
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

  // Converter numbers para strings para o banco (decimal)
  const dbData = {
    ...data,
    openingBalance: data.openingBalance.toString(),
    closingBalanceLocked: data.closingBalanceLocked?.toString(),
  };

  if (existing) {
    const [balance] = await db
      .update(monthlyBalances)
      .set({
        month: dbData.month,
        openingBalance: dbData.openingBalance,
        closingBalanceLocked: dbData.closingBalanceLocked,
        updatedAt: new Date(),
      })
      .where(eq(monthlyBalances.month, data.month))
      .returning();
    return balance;
  } else {
    const [balance] = await db
      .insert(monthlyBalances)
      .values({
        month: dbData.month,
        openingBalance: dbData.openingBalance,
        closingBalanceLocked: dbData.closingBalanceLocked,
      })
      .returning();
    return balance;
  }
}

export async function calculateAndUpdateOpeningBalance(month: string) {
  const [year, monthNum] = month.split('-').map(Number);

  // 🔧 Verificar se já existe um saldo salvo para este mês
  const existingBalance = await getMonthlyBalance(month);
  if (existingBalance) {
    // Se já existe um saldo salvo, não recalcular automaticamente
    // Isso preserva edições manuais do usuário
    return parseFloat(existingBalance.openingBalance);
  }

  // Calcula mês anterior
  const prevDate = new Date(year, monthNum - 1, 1);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = format(prevDate, 'yyyy-MM');

  // Busca saldo e transações do mês anterior
  const prevBalance = await getMonthlyBalance(prevMonth);
  const prevOpeningBalance = prevBalance?.openingBalance
    ? parseFloat(prevBalance.openingBalance)
    : 0;

  // Busca transações do mês anterior
  const prevStartDate = fromZonedTime(
    new Date(prevDate.getFullYear(), prevDate.getMonth(), 1, 0, 0, 0),
    BRAZIL_TZ
  );
  const prevEndDate = fromZonedTime(
    new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0, 23, 59, 59),
    BRAZIL_TZ
  );

  const prevTransactions = await db.query.financialTransactions.findMany({
    where: and(
      gte(financialTransactions.date, prevStartDate),
      lte(financialTransactions.date, prevEndDate)
    ),
  });

  // Busca vendas do mês anterior
  const prevOrders = await db
    .select({ total: orders.total, currency: orders.currency })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'completed'),
        gte(orders.createdAt, prevStartDate),
        lte(orders.createdAt, prevEndDate)
      )
    );

  // Calcula totais do mês anterior
  let prevIncome = 0;
  let prevExpense = 0;

  prevOrders.forEach(order => {
    const amount = parseFloat(order.total);
    const currency = order.currency || 'BRL';
    prevIncome += convertToBRL(amount, currency);
  });

  prevTransactions.forEach(t => {
    const amount = parseFloat(t.amount);
    if (t.type === 'INCOME') {
      prevIncome += amount;
    } else {
      prevExpense += amount;
    }
  });

  // Saldo inicial = Saldo inicial anterior + Entradas - Saídas
  const newOpeningBalance = prevOpeningBalance + prevIncome - prevExpense;

  // Atualiza ou cria saldo inicial do mês atual
  await upsertMonthlyBalance({
    month,
    openingBalance: newOpeningBalance,
    locked: false,
  });

  return newOpeningBalance;
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

  const result = await db.query.funds.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      category: true,
      contributions: {
        orderBy: [desc(fundContributions.month)],
      },
    },
    orderBy: [desc(funds.createdAt)],
  });

  console.log(
    '🟢 getFunds retornou:',
    result.map(f => ({
      id: f.id,
      title: f.title,
      contributionsCount: f.contributions?.length || 0,
      contributions: f.contributions?.map(c => c.month).slice(0, 5) || [],
    }))
  );

  return result;
}

export async function createFund(data: Omit<Fund, 'id'>) {
  try {
    console.log('🔵🔵🔵 CREATE FUND INICIADO 🔵🔵🔵');
    console.log('Dados recebidos:', JSON.stringify(data, null, 2));

    const fundData = {
      ...data,
      startDate: parseDateInBrazilTZ(data.startDate),
      endDate: data.endDate ? parseDateInBrazilTZ(data.endDate) : undefined,
      totalAmount:
        typeof data.totalAmount === 'number'
          ? data.totalAmount
          : parseFloat(String(data.totalAmount)),
      monthlyAmount:
        typeof data.monthlyAmount === 'number'
          ? data.monthlyAmount
          : parseFloat(String(data.monthlyAmount)),
    };

    console.log('Dados convertidos para insert:', {
      ...fundData,
      startDate: fundData.startDate.toISOString(),
      endDate: fundData.endDate?.toISOString(),
    });

    const [fund] = await db
      .insert(funds)
      .values({
        title: fundData.title,
        fundType: fundData.fundType,
        startDate: fundData.startDate,
        endDate: fundData.endDate,
        totalAmount: fundData.totalAmount.toString(),
        monthlyAmount: fundData.monthlyAmount.toString(),
        categoryId: fundData.categoryId,
        active: fundData.active,
        notes: fundData.notes,
      })
      .returning();

    if (!fund || !fund.id) {
      throw new Error('Falha ao criar fundo - ID não retornado');
    }

    console.log('✅✅✅ FUNDO CRIADO COM SUCESSO - ID:', fund.id);

    // Criar contribuições mensais automaticamente
    console.log('Chamando createFundContributions...');
    const count = await createFundContributions(fund.id);
    console.log('✅✅✅ CONTRIBUIÇÕES CRIADAS:', count);

    revalidatePath('/admin/financeiro');

    return fund;
  } catch (error) {
    console.error('❌❌❌ ERRO NO CREATE FUND:', error);
    throw error;
  }
}

export async function updateFund(id: string, data: Partial<Fund>) {
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: new Date(),
  };

  if (data.startDate) {
    updateData.startDate = parseDateInBrazilTZ(data.startDate);
  }
  if (data.endDate) {
    updateData.endDate = parseDateInBrazilTZ(data.endDate);
  }
  if (data.totalAmount !== undefined) {
    updateData.totalAmount =
      typeof data.totalAmount === 'number' ? data.totalAmount.toString() : data.totalAmount;
  }
  if (data.monthlyAmount !== undefined) {
    updateData.monthlyAmount =
      typeof data.monthlyAmount === 'number' ? data.monthlyAmount.toString() : data.monthlyAmount;
  }

  const [fund] = await db.update(funds).set(updateData).where(eq(funds.id, id)).returning();

  // Recriar contribuições com os novos valores
  await createFundContributions(id);

  return fund;
}

export async function deleteFund(id: string) {
  // Deletar contribuições primeiro (cascade)
  await db.delete(fundContributions).where(eq(fundContributions.fundId, id));
  await db.delete(funds).where(eq(funds.id, id));
}

// Criar contribuições mensais automaticamente
export async function createFundContributions(fundId: string) {
  try {
    console.log('🟣🟣🟣 CREATE FUND CONTRIBUTIONS INICIADO 🟣🟣🟣');
    console.log('Fund ID:', fundId);

    const fund = await db.query.funds.findFirst({
      where: eq(funds.id, fundId),
    });

    if (!fund) {
      console.error('❌ Fundo não encontrado:', fundId);
      throw new Error('Fundo não encontrado');
    }

    console.log('✓ Fundo encontrado:', {
      id: fund.id,
      title: fund.title,
      startDate: fund.startDate,
      endDate: fund.endDate,
      monthlyAmount: fund.monthlyAmount,
    });

    // Deletar contribuições existentes
    const deleted = await db.delete(fundContributions).where(eq(fundContributions.fundId, fundId));
    console.log('✓ Contribuições antigas deletadas:', deleted);

    const startDate = new Date(fund.startDate);
    const endDate = fund.endDate ? new Date(fund.endDate) : startDate;

    console.log('Datas recebidas:', {
      startDateRaw: fund.startDate,
      endDateRaw: fund.endDate,
      startDateParsed: startDate.toISOString(),
      endDateParsed: endDate.toISOString(),
    });

    const monthlyAmount = parseFloat(fund.monthlyAmount.toString());
    const contributions = [];

    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    console.log('✓ Período de loop:', {
      start: format(currentDate, 'yyyy-MM'),
      end: format(lastDate, 'yyyy-MM'),
      monthlyAmount,
    });

    let loopCount = 0;
    while (currentDate <= lastDate && loopCount < 100) {
      // Safety limit
      const monthStr = format(currentDate, 'yyyy-MM');

      contributions.push({
        fundId: fundId,
        month: monthStr,
        expectedAmount: monthlyAmount.toString(),
        saved: false,
        savedAmount: '0',
      });

      console.log(`  → Adicionando contribuição ${loopCount + 1}: ${monthStr}`);
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      loopCount++;
    }

    console.log(`✓ Total de ${contributions.length} contribuições preparadas`);

    if (contributions.length === 0) {
      console.warn('⚠️ NENHUMA CONTRIBUIÇÃO FOI GERADA!');
      return 0;
    }

    console.log('Inserindo contribuições no banco...');
    const inserted = await db.insert(fundContributions).values(contributions);
    console.log('✅✅✅ CONTRIBUIÇÕES INSERIDAS:', inserted);

    // Verificar se foram realmente inseridas
    const verify = await db.query.fundContributions.findMany({
      where: eq(fundContributions.fundId, fundId),
    });
    console.log('✅ Verificação: encontradas', verify.length, 'contribuições no banco');

    return contributions.length;
  } catch (error) {
    console.error('❌❌❌ ERRO NO CREATE FUND CONTRIBUTIONS:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    throw error;
  }
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
    fundId: data.fundId,
    month: data.month,
    expectedAmount:
      typeof data.expectedAmount === 'number'
        ? data.expectedAmount.toString()
        : data.expectedAmount,
    saved: data.saved,
    savedAmount:
      typeof data.savedAmount === 'number' ? data.savedAmount.toString() : data.savedAmount,
    savedAt: data.saved && data.savedAt ? parseDateInBrazilTZ(data.savedAt) : undefined,
  };

  if (existing) {
    const [contribution] = await db
      .update(fundContributions)
      .set({ ...contributionData, updatedAt: new Date() })
      .where(eq(fundContributions.id, existing.id))
      .returning();
    return contribution;
  } else {
    const [contribution] = await db.insert(fundContributions).values(contributionData).returning();
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

  // Buscar informações do fundo para criar a transação
  const fund = await db.query.funds.findFirst({
    where: eq(funds.id, fundId),
  });

  if (!fund) {
    throw new Error('Fundo não encontrado');
  }

  const savedAmountValue = amount || parseFloat(existing.expectedAmount);

  const updateData = {
    saved,
    savedAmount: savedAmountValue.toString(),
    savedAt: saved ? new Date() : null,
    updatedAt: new Date(),
  };

  const [contribution] = await db
    .update(fundContributions)
    .set(updateData)
    .where(eq(fundContributions.id, existing.id))
    .returning();

  // Se marcou como PAGO, criar transação de despesa
  if (saved) {
    // Criar data do primeiro dia do mês
    const [year, monthNum] = month.split('-');
    const dueDay = fund.startDate ? parseDateInBrazilTZ(fund.startDate).getDate() : 10; // Usa o dia de startDate do fundo
    const transactionDate = fromZonedTime(
      new Date(parseInt(year), parseInt(monthNum) - 1, dueDay, 12, 0, 0),
      'America/Sao_Paulo'
    );

    const transactionAmount =
      typeof amount === 'number' ? amount.toString() : existing.expectedAmount;

    // Criar transação de despesa
    await db.insert(financialTransactions).values({
      id: crypto.randomUUID(),
      type: 'EXPENSE',
      scope: fund.fundType === 'ANNUAL_BILL' ? 'STORE' : 'PERSONAL',
      expenseKind: 'FIXED',
      description: `${fund.title} - ${format(transactionDate, 'MMM/yyyy', { locale: ptBR })}`,
      amount: transactionAmount,
      date: transactionDate,
      paid: true,
      paidAt: new Date(),
      categoryId: fund.categoryId,
      paymentMethod: 'PIX', // Padrão, pode ser alterado depois
      notes: `Pagamento automático de fundo: ${fund.title}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  // Se desmarcou como NÃO PAGO, buscar e deletar a transação correspondente
  else {
    const [year, monthNum] = month.split('-');
    const dueDay = fund.startDate ? parseDateInBrazilTZ(fund.startDate).getDate() : 10;
    const transactionDate = fromZonedTime(
      new Date(parseInt(year), parseInt(monthNum) - 1, dueDay, 12, 0, 0),
      'America/Sao_Paulo'
    );

    // Buscar transação com descrição similar no mesmo dia
    const transactionToDelete = await db.query.financialTransactions.findFirst({
      where: and(
        eq(financialTransactions.type, 'EXPENSE'),
        eq(financialTransactions.date, transactionDate),
        like(financialTransactions.description, `${fund.title}%`)
      ),
    });

    if (transactionToDelete) {
      await db
        .delete(financialTransactions)
        .where(eq(financialTransactions.id, transactionToDelete.id));
    }
  }

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

  // Adicionar transações manuais (APENAS PAGAS para o saldo atual)
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

    // IMPORTANTE: Só conta no saldo atual se estiver PAGO
    if (t.paid) {
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
