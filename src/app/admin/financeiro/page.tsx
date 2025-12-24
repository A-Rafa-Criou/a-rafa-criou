'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, TrendingUp, Edit, Trash2, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { DashboardSection } from '@/components/financial/dashboard-section';
import { FundsSection } from '@/components/financial/funds-section';
import { FundDialog } from '@/components/financial/fund-dialog';
import { TransactionTable } from '@/components/financial/transaction-table';
import { TransactionForm } from '@/components/financial/transaction-form';
import { ReportsSection } from '@/components/financial/reports-section';
import { CategoryDialog } from '@/components/financial/category-dialog';

import {
  getDashboardSummary,
  getStoreIncome,
  getTransactions,
  createTransaction,
  createInstallmentTransactions,
  createRecurringTransactions,
  updateTransaction,
  deleteTransaction,
  markTransactionAsPaid,
  cancelRecurrence,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  upsertMonthlyBalance,
  calculateAndUpdateOpeningBalance,
  getFunds,
  createFund,
  updateFund,
  deleteFund,
  markContributionAsSaved,
  getPaymentMethodStats,
  getCategoryStats,
  getTopExpenses,
} from '@/actions/financial';

import type {
  FinancialTransaction,
  FinancialCategory,
  DashboardSummary as DashboardSummaryType,
  StoreIncome,
  PaymentMethodStats,
  CategoryStats,
  TopExpenses,
} from '@/types/financial';

export default function FinancialPage() {
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [activeTab, setActiveTab] = useState(() => {
    // Recupera a aba salva no localStorage ou usa 'dashboard' como padrão
    if (typeof window !== 'undefined') {
      return localStorage.getItem('financialActiveTab') || 'dashboard';
    }
    return 'dashboard';
  });
  const [loading, setLoading] = useState(true);

  // Funções para navegar entre meses
  const goToPreviousMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(format(date, 'yyyy-MM'));
  };

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(format(date, 'yyyy-MM'));
  };

  // State para dados
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryType | null>(null);
  const [storeIncome, setStoreIncome] = useState<StoreIncome[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [funds, setFunds] = useState<any[]>([]);

  // Transações por seção
  const [storeMonthly, setStoreMonthly] = useState<any[]>([]);
  const [storeVariable, setStoreVariable] = useState<any[]>([]);
  const [personalMonthly, setPersonalMonthly] = useState<any[]>([]);
  const [personalDaily, setPersonalDaily] = useState<any[]>([]);
  const [extraIncome, setExtraIncome] = useState<any[]>([]); // Receitas extras

  // Relatórios
  const [paymentMethodStats, setPaymentMethodStats] = useState<PaymentMethodStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [topExpenses, setTopExpenses] = useState<TopExpenses[]>([]);

  // Modais
  const [formOpen, setFormOpen] = useState(false);
  const [formConfig, setFormConfig] = useState<{
    type: 'INCOME' | 'EXPENSE';
    scope: 'STORE' | 'PERSONAL';
    expenseKind?: 'FIXED' | 'VARIABLE' | 'DAILY';
  } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  // Dialog de categorias
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | undefined>(undefined);

  // Dialog de fundos
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<any>(null);
  const [fundType, setFundType] = useState<'ANNUAL_BILL' | 'INVESTMENT'>('ANNUAL_BILL');

  // Saldo inicial
  const [openingBalance, setOpeningBalance] = useState(0);
  const [editingBalance, setEditingBalance] = useState(false);

  // Carregar dados
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Calcula e atualiza saldo inicial automaticamente baseado no mês anterior
      await calculateAndUpdateOpeningBalance(currentMonth);

      const [
        summary,
        income,
        cats,
        fundsData,
        storeMonthlyData,
        storeVariableData,
        personalMonthlyData,
        personalDailyData,
        extraIncomeData,
        paymentStats,
        catStats,
        topExp,
      ] = await Promise.all([
        getDashboardSummary(currentMonth),
        getStoreIncome(currentMonth),
        getCategories({ active: true }),
        getFunds({ active: true }),
        getTransactions({ month: currentMonth, scope: 'STORE', expenseKind: 'FIXED' }),
        getTransactions({ month: currentMonth, scope: 'STORE', expenseKind: 'VARIABLE' }),
        getTransactions({ month: currentMonth, scope: 'PERSONAL', expenseKind: 'FIXED' }),
        getTransactions({ month: currentMonth, scope: 'PERSONAL', expenseKind: 'DAILY' }),
        getTransactions({ month: currentMonth, type: 'INCOME' }), // Buscar receitas extras
        getPaymentMethodStats(currentMonth),
        getCategoryStats(currentMonth),
        getTopExpenses(currentMonth, 10),
      ]);

      setDashboardSummary(summary);
      setStoreIncome(income);
      setCategories(cats as FinancialCategory[]);
      setFunds(fundsData);
      setStoreMonthly(storeMonthlyData);
      setStoreVariable(storeVariableData);
      setPersonalMonthly(personalMonthlyData);
      setPersonalDaily(personalDailyData);
      setExtraIncome(extraIncomeData); // Armazena receitas extras
      setPaymentMethodStats(paymentStats);
      setCategoryStats(catStats);
      setTopExpenses(topExp);
      setOpeningBalance(summary.openingBalance);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveBalance = async () => {
    try {
      await upsertMonthlyBalance({
        month: currentMonth,
        openingBalance: openingBalance,
        locked: false,
      });
      toast.success('Saldo inicial atualizado');
      setEditingBalance(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar saldo:', error);
      toast.error('Erro ao salvar saldo inicial');
    }
  };

  const handleCreateTransaction = (
    type: 'INCOME' | 'EXPENSE',
    scope: 'STORE' | 'PERSONAL',
    expenseKind?: 'FIXED' | 'VARIABLE' | 'DAILY'
  ) => {
    setFormConfig({ type, scope, expenseKind });
    setEditingTransaction(null);
    setFormOpen(true);
  };

  const handleEditTransaction = (transaction: any) => {
    setFormConfig({
      type: transaction.type,
      scope: transaction.scope,
      expenseKind: transaction.expenseKind,
    });
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleSubmitTransaction = async (data: Partial<FinancialTransaction>) => {
    try {
      if (editingTransaction?.id) {
        await updateTransaction(editingTransaction.id, data);
        toast.success('Transação atualizada');
      } else {
        // Verifica se é recorrente
        if (data.recurrence && data.recurrence !== 'ONE_OFF') {
          const months = data.recurrence === 'MONTHLY' ? 12 : 3; // 12 meses para mensal, 3 anos para anual
          await createRecurringTransactions({
            baseTransaction: data as FinancialTransaction,
            months,
          });
          toast.success(`Despesa recorrente criada para os próximos ${months} ${data.recurrence === 'MONTHLY' ? 'meses' : 'anos'}`);
        }
        // Verifica se é parcelado
        else if (data.installmentsTotal && data.installmentsTotal > 1) {
          await createInstallmentTransactions({
            baseTransaction: data as FinancialTransaction,
            installments: data.installmentsTotal,
          });
          toast.success(`${data.installmentsTotal} parcelas criadas`);
        }
        // Transação única
        else {
          await createTransaction(data as FinancialTransaction);
          toast.success('Transação criada');
        }
      }
      loadData();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      toast.error('Erro ao salvar transação');
      throw error;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta transação? Se for recorrente, TODAS as ocorrências desta data em diante serão apagadas (as anteriores permanecerão).')) return;
    try {
      await deleteTransaction(id);
      toast.success('Transação excluída com sucesso');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      toast.error('Erro ao excluir transação');
    }
  };

  const handleTogglePaid = async (id: string, paid: boolean) => {
    try {
      await markTransactionAsPaid(id, paid);
      toast.success(paid ? 'Marcado como pago' : 'Marcado como pendente');
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleCancelRecurrence = async (id: string) => {
    if (!confirm('Deseja realmente cancelar esta recorrência? Isto irá cancelar esta ocorrência e todas as FUTURAS (as anteriores permanecerão).')) return;
    try {
      const result = await cancelRecurrence(id);
      toast.success(`Recorrência cancelada - ${Array.isArray(result) ? result.length : 1} transações afetadas`);
      loadData();
    } catch (error) {
      console.error('Erro ao cancelar recorrência:', error);
      toast.error('Erro ao cancelar recorrência');
    }
  };

  const handleToggleFundContribution = async (fundId: string, month: string, saved: boolean) => {
    try {
      await markContributionAsSaved(fundId, month, saved);
      toast.success(saved ? 'Contribuição marcada' : 'Contribuição desmarcada');
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar contribuição:', error);
      toast.error('Erro ao atualizar contribuição');
    }
  };

  const handleCreateFund = (type: 'ANNUAL_BILL' | 'INVESTMENT') => {
    setFundType(type);
    setEditingFund(null);
    setFundDialogOpen(true);
  };

  const handleEditFund = (fund: any) => {
    setFundType(fund.fundType);
    setEditingFund(fund);
    setFundDialogOpen(true);
  };

  const handleDeleteFund = async (fundId: string) => {
    if (!confirm('Tem certeza que deseja deletar este fundo? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      await deleteFund(fundId);
      toast.success('Fundo deletado');
      loadData();
    } catch (error) {
      console.error('Erro ao deletar fundo:', error);
      toast.error('Erro ao deletar fundo');
    }
  };

  const handleFundSubmit = async (data: any) => {
    try {
      console.log('🔴 handleFundSubmit chamado com:', data);
      if (editingFund?.id) {
        await updateFund(editingFund.id, data);
        toast.success('Fundo atualizado');
      } else {
        const result = await createFund(data);
        console.log('🔴 Fundo criado:', result);
        toast.success('Fundo criado');
      }
      console.log('🔴 Recarregando dados...');
      await loadData();
      console.log('🔴 Dados recarregados');
      setFundDialogOpen(false);
    } catch (error) {
      console.error('❌ Erro ao salvar fundo:', error);
      toast.error('Erro ao salvar fundo');
    }
  };

  const handleCategorySubmit = async (data: Partial<FinancialCategory>) => {
    try {
      if (editingCategory?.id) {
        await updateCategory(editingCategory.id, data);
        toast.success('Categoria atualizada');
      } else {
        await createCategory(data as Omit<FinancialCategory, 'id'>);
        toast.success('Categoria criada');
      }
      loadData();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error('Erro ao salvar categoria');
      throw error;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta categoria?')) return;
    try {
      await deleteCategory(id);
      toast.success('Categoria excluída');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">💰 Gestão Financeira</h1>
          <p className="text-gray-700 mt-2 font-medium">Controle completo das finanças da loja e pessoal</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

          {/* Seletor de mês */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#FED466]/20 to-[#FD9555]/20 p-3 rounded-lg border-2 border-[#FD9555]">
            <Button
              onClick={goToPreviousMonth}
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-[#FD9555]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Mês anterior"
              disabled={currentMonth <= '2025-12'}
            >
              <ChevronLeft className="h-5 w-5 text-[#FD9555]" />
            </Button>

            <Input
              type="month"
              value={currentMonth}
              onChange={e => setCurrentMonth(e.target.value)}
              className="w-44 border-2 border-gray-300 text-gray-900 font-semibold"
            />
            <Button
              onClick={goToNextMonth}
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-[#FD9555]/20 cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="h-5 w-5 text-[#FD9555]" />
            </Button>
          </div>
        </div>
      </div>

      {/* Saldo Inicial */}
      <Card className="bg-gradient-to-br from-[#FED466] to-[#FED466]/80 border-2 border-[#FD9555] shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <Label className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Saldo Inicial do Mês
              </Label>
              {editingBalance ? (
                <div className="flex gap-2 mt-3">
                  <Input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-56 border-2 border-gray-300 text-gray-900 font-semibold text-lg"
                  />
                  <Button
                    onClick={handleSaveBalance}
                    className="bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-semibold"
                  >
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingBalance(false)}
                    className="border-2 border-gray-400 text-gray-700 font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4 mt-3">
                  <p className="text-4xl font-bold text-gray-900">
                    {formatCurrency(openingBalance)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingBalance(true)}
                    className="text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 font-semibold"
                  >
                    Editar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // Salva a aba ativa no localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('financialActiveTab', value);
          }
        }} className="w-full">
          <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 bg-transparent p-0 gap-2 mb-6 h-auto">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-[#FD9555] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-[#FD9555] bg-white text-gray-700 text-xs md:text-sm font-semibold cursor-pointer transition-all duration-200 rounded-lg px-2 md:px-3 py-2 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
            >
              📊 Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="funds"
              className="data-[state=active]:bg-[#FD9555] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-[#FD9555] bg-white text-gray-700 text-xs md:text-sm font-semibold cursor-pointer transition-all duration-200 rounded-lg px-2 md:px-3 py-2 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
            >
              💰 Fundos
            </TabsTrigger>
            <TabsTrigger
              value="store"
              className="data-[state=active]:bg-[#FD9555] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-[#FD9555] bg-white text-gray-700 text-xs md:text-sm font-semibold cursor-pointer transition-all duration-200 rounded-lg px-2 md:px-3 py-2 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
            >
              🏪 Loja
            </TabsTrigger>
            <TabsTrigger
              value="personal"
              className="data-[state=active]:bg-[#FD9555] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-[#FD9555] bg-white text-gray-700 text-xs md:text-sm font-semibold cursor-pointer transition-all duration-200 rounded-lg px-2 md:px-3 py-2 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
            >
              👤 Pessoal
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="data-[state=active]:bg-[#FD9555] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-[#FD9555] bg-white text-gray-700 text-xs md:text-sm font-semibold cursor-pointer transition-all duration-200 rounded-lg px-2 md:px-3 py-2 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
            >
              📈 Relatórios
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-[#FD9555] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-[#FD9555] bg-white text-gray-700 text-xs md:text-sm font-semibold cursor-pointer transition-all duration-200 rounded-lg px-2 md:px-3 py-2 border-2 border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
            >
              🏷️ Categorias
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="mt-0 space-y-6">
            {dashboardSummary && <DashboardSection summary={dashboardSummary} />}
          </TabsContent>

          {/* Fundos */}
          <TabsContent value="funds" className="mt-0 space-y-6">
            <FundsSection
              annualBills={funds.filter((f: any) => f.fundType === 'ANNUAL_BILL')}
              investments={funds.filter((f: any) => f.fundType === 'INVESTMENT')}
              currentMonth={currentMonth}
              onCreateFund={handleCreateFund}
              onEditFund={handleEditFund}
              onDeleteFund={handleDeleteFund}
              onToggleContribution={handleToggleFundContribution}
            />
          </TabsContent>

          {/* Loja */}
          <TabsContent value="store" className="mt-0 space-y-6">
            {/* Vendas Extras / Receitas */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-green-900">💵 Vendas Extras / Receitas</h3>
                <Button
                  onClick={() => {
                    setFormConfig({ type: 'INCOME', scope: 'STORE' });
                    setEditingTransaction(null);
                    setFormOpen(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Receita
                </Button>
              </div>
              <TransactionTable
                transactions={extraIncome.map(t => ({
                  ...t,
                  categoryName: t.category?.name,
                }))}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onTogglePaid={handleTogglePaid}
                onCancelRecurrence={handleCancelRecurrence}
              />
            </div>

            {/* Contas mensais */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">🏪 Contas Mensais da Loja</h3>
                <Button
                  onClick={() => handleCreateTransaction('EXPENSE', 'STORE', 'FIXED')}
                  className="bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-semibold shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conta
                </Button>
              </div>
              <TransactionTable
                transactions={storeMonthly.map(t => ({
                  ...t,
                  categoryName: t.category?.name,
                }))}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onTogglePaid={handleTogglePaid}
                onCancelRecurrence={handleCancelRecurrence}
              />
            </div>

            {/* Contas variáveis */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">🔄 Contas Variáveis da Loja</h3>
                <Button
                  onClick={() => handleCreateTransaction('EXPENSE', 'STORE', 'VARIABLE')}
                  className="bg-[#FD9555] hover:bg-[#FD9555]/90 text-white font-semibold shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conta
                </Button>
              </div>
              <TransactionTable
                transactions={storeVariable.map(t => ({
                  ...t,
                  categoryName: t.category?.name,
                }))}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onTogglePaid={handleTogglePaid}
                onCancelRecurrence={handleCancelRecurrence}
              />
            </div>

            {/* Entradas automáticas */}
            <Card className="bg-white border-2 border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b-2 border-green-200">
                <CardTitle className="text-xl font-bold text-green-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Entradas da Loja (Automáticas)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {storeIncome.length > 0 ? (
                  <div className="space-y-3">
                    {[...storeIncome].reverse().map((income, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-transparent rounded-lg border border-green-200 hover:shadow-md transition-shadow"
                      >
                        <div>
                          <p className="font-bold text-gray-900 text-lg">
                            {format(new Date(income.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {income.orderCount} pedido{income.orderCount > 1 ? 's' : ''} • {income.source}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-700">
                            {formatCurrency(income.amount)}
                          </p>
                          {income.currency && income.currency !== 'BRL' && (
                            <p className="text-xs text-gray-500 mt-1">({income.currency})</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Total de Entradas */}
                    <Card className="bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 mt-4">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold text-green-900 uppercase">Total de Entradas</p>
                          <p className="text-3xl font-bold text-green-900">
                            {formatCurrency(storeIncome.reduce((sum, inc) => sum + inc.amount, 0))}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhuma venda no período</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pessoal */}
          <TabsContent value="personal" className="mt-0 space-y-6">
            {/* Contas mensais */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">👤 Contas Pessoais Mensais</h3>
                <Button
                  onClick={() => handleCreateTransaction('EXPENSE', 'PERSONAL', 'FIXED')}
                  className="bg-[#FED466] hover:bg-[#FED466]/90 text-gray-900 font-semibold shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conta
                </Button>
              </div>
              <TransactionTable
                transactions={personalMonthly.map(t => ({
                  ...t,
                  categoryName: t.category?.name,
                }))}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onTogglePaid={handleTogglePaid}
                onCancelRecurrence={handleCancelRecurrence}
              />
            </div>

            {/* Gastos dia a dia */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">🛍️ Gastos Pessoais Dia a Dia</h3>
                <Button
                  onClick={() => handleCreateTransaction('EXPENSE', 'PERSONAL', 'DAILY')}
                  className="bg-[#FED466] hover:bg-[#FED466]/90 text-gray-900 font-semibold shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Gasto
                </Button>
              </div>
              <TransactionTable
                transactions={personalDaily.map(t => ({
                  ...t,
                  categoryName: t.category?.name,
                }))}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
                onTogglePaid={handleTogglePaid}
                onCancelRecurrence={handleCancelRecurrence}
              />
            </div>
          </TabsContent>

          {/* Relatórios */}
          <TabsContent value="reports" className="mt-0 space-y-6">
            <ReportsSection
              storeTotal={dashboardSummary?.storeExpenses || 0}
              personalTotal={dashboardSummary?.personalExpenses || 0}
              paymentMethods={paymentMethodStats}
              categories={categoryStats}
              topExpenses={topExpenses}
            />
          </TabsContent>

          {/* Categorias */}
          <TabsContent value="categories" className="mt-0 space-y-6">
            <Card className="bg-white border-2 border-gray-200 shadow-lg">
              <CardHeader className="border-b-2 border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="h-6 w-6 text-[#FD9555]" />
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      Gerenciar Categorias
                    </CardTitle>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingCategory(undefined);
                      setCategoryDialogOpen(true);
                    }}
                    className="bg-[#FED466] hover:bg-[#FED466]/90 text-gray-900 font-bold shadow-lg border-2 border-[#FD9555] cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Categoria
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {categories.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-semibold">Nenhuma categoria criada</p>
                    <p className="text-sm mt-2">Clique em &quot;Nova Categoria&quot; para criar sua primeira categoria</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories
                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                      .map(category => (
                        <Card
                          key={category.id}
                          className="border-2 border-gray-200 hover:border-[#FD9555] transition-all duration-200 hover:shadow-lg"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-4 h-4 rounded-full border-2 border-gray-300"
                                  style={{ backgroundColor: category.color || '#FD9555' }}
                                  suppressHydrationWarning
                                />
                                <div>
                                  <h3 className="font-bold text-gray-900">{category.name}</h3>
                                  <div className="flex gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">
                                      {category.type === 'INCOME' ? 'Receita' : 'Despesa'}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">
                                      {category.scope === 'STORE' ? 'Loja' : category.scope === 'PERSONAL' ? 'Pessoal' : 'Ambos'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setCategoryDialogOpen(true);
                                }}
                                className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold cursor-pointer"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => category.id && handleDeleteCategory(category.id)}
                                disabled={!category.id}
                                className="border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Transação */}
      {formConfig && (
        <TransactionForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleSubmitTransaction}
          transaction={editingTransaction || undefined}
          categories={categories}
          type={formConfig.type}
          scope={formConfig.scope}
          expenseKind={formConfig.expenseKind}
        />
      )}

      {/* Modal de Categoria */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSubmit={handleCategorySubmit}
        category={editingCategory}
      />

      {/* Modal de Fundo */}
      <FundDialog
        open={fundDialogOpen}
        onOpenChange={setFundDialogOpen}
        onSubmit={handleFundSubmit}
        fund={editingFund}
        fundType={fundType}
        categories={categories}
      />
    </div>
  );
}
