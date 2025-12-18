'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Plus,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface FinancialStats {
  monthRevenue: number;
  monthExpenses: number;
  monthBalance: number;
  activeAffiliates: number;
  pendingCommissions: number;
  totalSales: number;
}

interface IncomeSource {
  id: string;
  description: string;
  value: number;
  category: 'loja' | 'afiliados' | 'outros';
}

interface ExpenseCategory {
  id: string;
  category: string;
  estimated: number;
  spent: number;
  color: string;
}

const PASTEL_COLORS = {
  vendas: '#D1FAE5',
  comissoes: '#FED7AA',
  mercadopago: '#E0E7FF',
  stripe: '#FCE7F3',
  paypal: '#E0F2FE',
  afiliados: '#FEF3C7',
  marketing: '#F3F4F6',
  despesas: '#FECACA',
  outros: '#E9D5FF',
};

export default function FinanceiroDashboard() {
  const [currentMonth] = useState(
    new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  );
  const [stats, setStats] = useState<FinancialStats>({
    monthRevenue: 0,
    monthExpenses: 0,
    monthBalance: 0,
    activeAffiliates: 0,
    pendingCommissions: 0,
    totalSales: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fontes de renda (vendas da loja + comissões)
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([
    { id: '1', description: 'Vendas Mercado Pago', value: 0, category: 'loja' },
    { id: '2', description: 'Vendas Stripe', value: 0, category: 'loja' },
    { id: '3', description: 'Vendas PayPal', value: 0, category: 'loja' },
    { id: '4', description: 'Comissões Afiliados', value: 0, category: 'afiliados' },
  ]);

  // Categorias de despesas
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([
    { id: '1', category: 'Comissões Afiliados', estimated: 1000, spent: 0, color: PASTEL_COLORS.comissoes },
    { id: '2', category: 'Marketing', estimated: 500, spent: 0, color: PASTEL_COLORS.marketing },
    { id: '3', category: 'Despesas Fixas', estimated: 300, spent: 0, color: PASTEL_COLORS.despesas },
    { id: '4', category: 'Outros', estimated: 200, spent: 0, color: PASTEL_COLORS.outros },
  ]);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const res = await fetch('/api/financial/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);

        // Atualizar fontes de renda (simplificado - você pode criar uma API específica)
        setIncomeSources((prev) =>
          prev.map((source) => {
            if (source.description.includes('Comissões')) {
              return { ...source, value: data.pendingCommissions };
            }
            return { ...source, value: data.monthRevenue / 3 }; // Dividido entre gateways
          })
        );

        // Atualizar despesas
        setExpenseCategories((prev) =>
          prev.map((cat) => {
            if (cat.category === 'Comissões Afiliados') {
              return { ...cat, spent: data.pendingCommissions };
            }
            return cat;
          })
        );
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos
  const totalIncome = incomeSources.reduce((sum, source) => sum + source.value, 0);
  const totalEstimated = expenseCategories.reduce((sum, cat) => sum + cat.estimated, 0);
  const totalSpent = expenseCategories.reduce((sum, cat) => sum + cat.spent, 0);
  const remaining = totalIncome - totalSpent;
  const budgetPercentage = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

  // Alertas
  const alerts = useMemo(() => {
    const newAlerts: { type: 'error' | 'warning' | 'info'; message: string }[] = [];

    if (totalSpent > totalIncome) {
      newAlerts.push({
        type: 'error',
        message: '⚠️ Atenção: Seus gastos ultrapassaram a renda do mês!',
      });
    } else if (budgetPercentage > 80) {
      newAlerts.push({
        type: 'warning',
        message: `⚠️ Você já usou mais de 80% do seu Orçamento!`,
      });
    }

    const overspentCategories = expenseCategories.filter((cat) => cat.spent > cat.estimated);
    if (overspentCategories.length > 0) {
      newAlerts.push({
        type: 'warning',
        message: `📊 ${overspentCategories.length} categorias extrapolaram o Orçamento`,
      });
    }

    return newAlerts;
  }, [totalSpent, totalIncome, budgetPercentage, expenseCategories]);

  // Dados para gráficos
  const chartData = expenseCategories.map((cat) => ({
    category: cat.category,
    estimativa: cat.estimated,
    gasto: cat.spent,
  }));

  const pieData = expenseCategories
    .filter((cat) => cat.spent > 0)
    .map((cat) => ({
      name: cat.category,
      value: cat.spent,
      percentage: totalSpent > 0 ? ((cat.spent / totalSpent) * 100).toFixed(1) : '0',
      color: cat.color,
    }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Cabeçalho Moderno */}
      <Card className="mb-8 border-0 shadow-xl bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 text-white">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-4xl md:text-5xl font-bold tracking-wide">
            💰 Controle Financeiro
          </CardTitle>
          <p className="text-xl opacity-90 mt-2">{currentMonth}</p>
        </CardHeader>
      </Card>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-400 to-green-500 text-white">
          <CardContent className="p-6 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Receita</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.monthRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-400 to-red-500 text-white">
          <CardContent className="p-6 text-center">
            <TrendingDown className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Despesas</p>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-400 to-blue-500 text-white">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Saldo</p>
            <p className="text-2xl font-bold">{formatCurrency(remaining)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-400 to-purple-500 text-white">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Afiliados</p>
            <p className="text-2xl font-bold">{stats.activeAffiliates}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-400 to-orange-500 text-white">
          <CardContent className="p-6 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Comissões</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.pendingCommissions)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-400 to-pink-500 text-white">
          <CardContent className="p-6 text-center">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm opacity-90">Vendas</p>
            <p className="text-2xl font-bold">{stats.totalSales}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, index) => (
            <Card
              key={index}
              className={`border-0 shadow-lg ${
                alert.type === 'error'
                  ? 'bg-red-50 border-red-200'
                  : alert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                {alert.type === 'error' ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : alert.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
                <p className="text-sm font-medium">{alert.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progresso do Orçamento */}
      <Card className="mb-8 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Uso do Orçamento</h3>
            <span className="text-2xl font-bold">{budgetPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={budgetPercentage} className="h-4" />
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Gasto: {formatCurrency(totalSpent)}</span>
            <span>Renda: {formatCurrency(totalIncome)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fontes de Renda */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Fontes de Renda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {incomeSources.map((source) => (
                <div key={source.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{source.description}</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(source.value)}</span>
                </div>
              ))}
              <div className="pt-4 border-t-2 flex justify-between">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-2xl text-green-600">{formatCurrency(totalIncome)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categorias de Despesas */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-br from-green-100 to-green-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Categorias de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {expenseCategories.map((cat) => (
                <div key={cat.id}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-sm">
                      {formatCurrency(cat.spent)} / {formatCurrency(cat.estimated)}
                    </span>
                  </div>
                  <Progress
                    value={cat.estimated > 0 ? (cat.spent / cat.estimated) * 100 : 0}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Barras */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Comparativo: Estimado vs Gasto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="estimativa" fill="#8884d8" name="Estimado" />
                <Bar dataKey="gasto" fill="#82ca9d" name="Gasto" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Distribuição de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(props: { index: number }) => {
                    const { index } = props;
                    return `${pieData[index].name}: ${pieData[index].percentage}%`;
                  }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => value ? formatCurrency(value) : ''} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="mt-8 border-0 shadow-xl bg-gradient-to-r from-gray-100 to-gray-200 mb-4">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button className="h-auto py-4 flex flex-col items-center gap-2" variant="outline">
              <Plus className="w-6 h-6" />
              <span>Nova Despesa</span>
            </Button>
            <Button className="h-auto py-4 flex flex-col items-center gap-2" variant="outline">
              <Download className="w-6 h-6" />
              <span>Exportar Relatório</span>
            </Button>
            <Button className="h-auto py-4 flex flex-col items-center gap-2" variant="outline">
              <BarChart3 className="w-6 h-6" />
              <span>Ver Histórico</span>
            </Button>
            <Button className="h-auto py-4 flex flex-col items-center gap-2" variant="outline">
              <Users className="w-6 h-6" />
              <span>Gerenciar Afiliados</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
