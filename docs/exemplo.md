'use client';

import { useState, useMemo } from 'react';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
TrendingUp,
TrendingDown,
DollarSign,
CreditCard,
Calculator,
PiggyBank,
AlertTriangle,
CheckCircle,
Calendar,
Plus,
FileText,
Settings,
Wallet,
Target,
Download,
Save,
X,
Eye,
EyeOff,
Trash2,
History,
Search,
Filter,
ChevronLeft,
ChevronRight,
BarChart3,
PieChart as PieChartIcon,
FileDown,
Edit,
CreditCard as CreditCardIcon,
Circle,
Flower
} from 'lucide-react';

interface IncomeSource {
id: string
description: string
value: number
}

interface ExpenseCategory {
id: string
category: string
estimated: number
spent: number
color: string
}

interface FixedExpense {
id: string
description: string
category: string
value: number
dueDate: string
status: 'pago' | 'pendente' | 'atrasado'
referenceMonth: string
}

interface CardExpense {
id: string
description: string
category: string
value: number
dueDate: string
installment?: string
}

interface CreditCard {
id: string
name: string
bank: string
color: string
icon: string
expenses: CardExpense[]
isActive: boolean
createdAt: string
}

interface MonthlyData {
id: string
month: string
year: number
income: number
expenses: number
remaining: number
categories: ExpenseCategory[]
fixedExpenses: FixedExpense[]
cardExpenses: { [cardId: string]: CardExpense[] }
incomeSources: IncomeSource[]
closedAt: string
notes?: string
}

interface AppSettings {
currency: string
monthStartDay: number
alertThreshold: number
categories: string[]
}

interface Alert {
type: 'error' | 'warning' | 'info'
message: string
}

const PASTEL_COLORS = {
contas: '#E0E7FF',
cosmeticos: '#FCE7F3',
educacao: '#E0F2FE',
lazer: '#FEF3C7',
mercado: '#D1FAE5',
outros: '#F3F4F6',
pets: '#FED7AA',
streaming: '#E9D5FF',
restaurante: '#FECACA',
saude: '#DBEAFE',
transporte: '#FEF3C7',
veiculo: '#FBBF24',
vestuario: '#C084FC',
viagem: '#A7F3D0'
}

const CARD_COLORS = [
{ name: 'Azul', value: '#3B82F6' },
{ name: 'Verde', value: '#10B981' },
{ name: 'Roxo', value: '#8B5CF6' },
{ name: 'Rosa', value: '#EC4899' },
{ name: 'Laranja', value: '#F97316' },
{ name: 'Cinza', value: '#6B7280' },
{ name: 'Vermelho', value: '#EF4444' },
{ name: 'Amarelo', value: '#EAB308' }
]

const DEFAULT_CATEGORIES = [
'Contas', 'Cosméticos', 'Educação', 'Lazer', 'Mercado', 'Outros',
'Pets', 'Streaming', 'Restaurante', 'Saúde', 'Transporte', 'Veículo',
'Vestuário', 'Viagem'
]

const iconMap: { [key: string]: any } = {
Circle,
Flower,
CreditCard,
Eye,
EyeOff
}

const renderIcon = (iconName: string, className?: string) => {
const IconComponent = iconMap[iconName]
if (!IconComponent) return iconName
return <IconComponent className={className} />
}

export default function ControleFinanceiro() {
const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
const [showCloseMonthDialog, setShowCloseMonthDialog] = useState(false)
const [showReportDialog, setShowReportDialog] = useState(false)
const [showSettingsDialog, setShowSettingsDialog] = useState(false)
const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false)
const [showHistoryDialog, setShowHistoryDialog] = useState(false)
const [showAddCardDialog, setShowAddCardDialog] = useState(false)
const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<MonthlyData | null>(null)
const [historySearch, setHistorySearch] = useState('')
const [historyFilter, setHistoryFilter] = useState('all')
const [closeMonthNotes, setCloseMonthNotes] = useState('')

const [creditCards, setCreditCards] = useState<CreditCard[]>([
{
id: '1',
name: 'Nubank',
bank: 'Nubank',
color: '#8B5CF6',
icon: 'Circle',
expenses: [
{ id: '1', description: 'Netflix', category: 'Streaming', value: 45.90, dueDate: '2024-12-15', installment: '1/12' },
{ id: '2', description: 'iFood', category: 'Restaurante', value: 89.50, dueDate: '2024-12-15' }
],
isActive: true,
createdAt: '2024-01-01T00:00:00'
},
{
id: '2',
name: 'Bradesco',
bank: 'Bradesco',
color: '#EC4899',
icon: 'Flower',
expenses: [
{ id: '1', description: 'Academia', category: 'Saúde', value: 120.00, dueDate: '2024-12-20', installment: '1/12' }
],
isActive: true,
createdAt: '2024-01-01T00:00:00'
}
])

const [newCard, setNewCard] = useState({
name: '',
bank: '',
color: '#3B82F6',
icon: 'CreditCard'
})

const [closedMonths, setClosedMonths] = useState<MonthlyData[]>([
// Dados exemplo para demonstração
{
id: '1',
month: 'Outubro/2024',
year: 2024,
income: 7500,
expenses: 6200,
remaining: 1300,
categories: [
{ id: '1', category: 'Contas', estimated: 1500, spent: 1450, color: PASTEL_COLORS.contas },
{ id: '2', category: 'Mercado', estimated: 800, spent: 750, color: PASTEL_COLORS.mercado },
{ id: '3', category: 'Lazer', estimated: 400, spent: 500, color: PASTEL_COLORS.lazer },
],
fixedExpenses: [
{ id: '1', description: 'Aluguel', category: 'Contas', value: 1200, dueDate: '2024-10-05', status: 'pago', referenceMonth: 'Outubro/2024' }
],
cardExpenses: {
'1': [
{ id: '1', description: 'Netflix', category: 'Streaming', value: 45.90, dueDate: '2024-10-15', installment: '1/12' }
],
'2': []
},
incomeSources: [
{ id: '1', description: 'Salário 1', value: 5000 },
{ id: '2', description: 'Salé¡rio 2', value: 2000 },
{ id: '3', description: 'Renda Extra', value: 500 }
],
closedAt: '2024-11-01T00:00:00',
notes: 'mês esté¡vel, controle de gastos bom'
},
{
id: '2',
month: 'Novembro/2024',
year: 2024,
income: 8000,
expenses: 7200,
remaining: 800,
categories: [
{ id: '1', category: 'Contas', estimated: 1500, spent: 1600, color: PASTEL_COLORS.contas },
{ id: '2', category: 'Mercado', estimated: 800, spent: 900, color: PASTEL_COLORS.mercado },
{ id: '3', category: 'Saúde', estimated: 200, spent: 300, color: PASTEL_COLORS.saude },
],
fixedExpenses: [
{ id: '1', description: 'Aluguel', category: 'Contas', value: 1200, dueDate: '2024-11-05', status: 'pago', referenceMonth: 'Novembro/2024' }
],
cardExpenses: {
'1': [
{ id: '1', description: 'Netflix', category: 'Streaming', value: 45.90, dueDate: '2024-11-15', installment: '2/12' }
],
'2': [
{ id: '1', description: 'Academia', category: 'Saúde', value: 120.00, dueDate: '2024-11-20', installment: '2/12' }
]
},
incomeSources: [
{ id: '1', description: 'Salé¡rio 1', value: 5500 },
{ id: '2', description: 'Salé¡rio 2', value: 2000 },
{ id: '3', description: 'Bônus', value: 500 }
],
closedAt: '2024-12-01T00:00:00',
notes: 'Gastos acima do esperado, atenção para dezembro'
}
])

const [settings, setSettings] = useState<AppSettings>({
currency: 'BRL',
monthStartDay: 1,
alertThreshold: 80,
categories: DEFAULT_CATEGORIES
})

const [newExpense, setNewExpense] = useState({
description: '',
category: '',
value: '',
type: 'category' as 'category' | 'fixed' | 'card',
cardId: ''
})

const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([
{ id: '1', description: 'Salé¡rio 1', value: 5000 },
{ id: '2', description: 'Salé¡rio 2', value: 2000 },
{ id: '3', description: 'Renda Extra', value: 500 }
])

const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([
{ id: '1', category: 'Contas', estimated: 1500, spent: 1200, color: PASTEL_COLORS.contas },
{ id: '2', category: 'Cosméticos', estimated: 200, spent: 250, color: PASTEL_COLORS.cosmeticos },
{ id: '3', category: 'Educação', estimated: 300, spent: 300, color: PASTEL_COLORS.educacao },
{ id: '4', category: 'Lazer', estimated: 400, spent: 450, color: PASTEL_COLORS.lazer },
{ id: '5', category: 'Mercado', estimated: 800, spent: 750, color: PASTEL_COLORS.mercado },
{ id: '6', category: 'Outros', estimated: 200, spent: 100, color: PASTEL_COLORS.outros },
{ id: '7', category: 'Pets', estimated: 150, spent: 150, color: PASTEL_COLORS.pets },
{ id: '8', category: 'Streaming', estimated: 100, spent: 100, color: PASTEL_COLORS.streaming },
{ id: '9', category: 'Restaurante', estimated: 300, spent: 400, color: PASTEL_COLORS.restaurante },
{ id: '10', category: 'Saúde', estimated: 200, spent: 150, color: PASTEL_COLORS.saude },
{ id: '11', category: 'Transporte', estimated: 250, spent: 200, color: PASTEL_COLORS.transporte },
{ id: '12', category: 'Veículo', estimated: 300, spent: 350, color: PASTEL_COLORS.veiculo },
{ id: '13', category: 'Vestuário', estimated: 200, spent: 180, color: PASTEL_COLORS.vestuario },
{ id: '14', category: 'Viagem', estimated: 500, spent: 0, color: PASTEL_COLORS.viagem }
])

const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([
{ id: '1', description: 'Aluguel', category: 'Contas', value: 1200, dueDate: '2024-12-05', status: 'pago', referenceMonth: 'Dezembro/2024' },
{ id: '2', description: 'Condomí­nio', category: 'Contas', value: 300, dueDate: '2024-12-10', status: 'pago', referenceMonth: 'Dezembro/2024' }
])

// Cé¡lculos automé¡ticos
const totalIncome = incomeSources.reduce((sum, source) => sum + source.value, 0)
const totalEstimated = expenseCategories.reduce((sum, cat) => sum + cat.estimated, 0)
const totalSpent = expenseCategories.reduce((sum, cat) => sum + cat.spent, 0)
const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.value, 0)
const totalCards = creditCards.reduce((sum, card) => sum + card.expenses.reduce((cardSum, exp) => cardSum + exp.value, 0), 0)
const difference = totalEstimated - totalSpent
const remaining = totalIncome - totalSpent
const budgetPercentage = totalIncome > 0 ? (totalSpent / totalIncome) \* 100 : 0

// Categoria que mais consumiu
const topCategory = useMemo(() => {
if (expenseCategories.length === 0) return { category: 'N/A', spent: 0 }
return expenseCategories.reduce((max, cat) =>
cat.spent > max.spent ? cat : max, expenseCategories[0]
)
}, [expenseCategories])

// Filtros de histé³rico
const filteredHistory = useMemo(() => {
let filtered = [...closedMonths]

    if (historySearch) {
      filtered = filtered.filter(month =>
        month.month.toLowerCase().includes(historySearch.toLowerCase()) ||
        month.notes?.toLowerCase().includes(historySearch.toLowerCase())
      )
    }

    if (historyFilter !== 'all') {
      filtered = filtered.filter(month => {
        switch (historyFilter) {
          case 'positive':
            return month.remaining > 0
          case 'negative':
            return month.remaining < 0
          case 'high':
            return month.expenses > month.income * 0.9
          case 'low':
            return month.expenses < month.income * 0.5
          default:
            return true
        }
      })
    }

    return filtered.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime())

}, [closedMonths, historySearch, historyFilter])

// Dados para gré¡ficos histé³ricos
const historyChartData = useMemo(() => {
return closedMonths.map(month => ({
month: month.month,
renda: month.income,
gastos: month.expenses,
saldo: month.remaining
}))
}, [closedMonths])

const historyPieData = useMemo(() => {
const totalExpenses = closedMonths.reduce((sum, month) => sum + month.expenses, 0)
const categoryTotals: { [key: string]: number } = {}

    closedMonths.forEach(month => {
      month.categories.forEach(cat => {
        if (!categoryTotals[cat.category]) {
          categoryTotals[cat.category] = 0
        }
        categoryTotals[cat.category] += cat.spent
      })
    })

    return Object.entries(categoryTotals).map(([category, total]) => ({
      name: category,
      value: total,
      percentage: totalExpenses > 0 ? ((total / totalExpenses) * 100).toFixed(1) : '0'
    }))

}, [closedMonths])

// Dados para gré¡ficos de Cartões
const cardChartData = useMemo(() => {
return creditCards.filter(card => card.isActive).map(card => ({
name: card.name,
value: card.expenses.reduce((sum, exp) => sum + exp.value, 0),
color: card.color,
percentage: totalCards > 0 ? ((card.expenses.reduce((sum, exp) => sum + exp.value, 0) / totalCards) \* 100) : 0
}))
}, [creditCards, totalCards])

// Alertas inteligentes
const alerts = useMemo(() => {
const newAlerts: Alert[] = []

    if (totalSpent > totalIncome) {
      newAlerts.push({ type: 'error', message: 'âš ï¸ Atenção: Seus gastos ultrapassaram a renda do mês!' })
    } else if (budgetPercentage > settings.alertThreshold) {
      newAlerts.push({ type: 'warning', message: `âš ï¸ Vocéª jé¡ usou mais de ${settings.alertThreshold}% do seu Orçamento!` })
    } else if (budgetPercentage > 70) {
      newAlerts.push({ type: 'info', message: 'â„¹ï¸ Vocéª jé¡ usou mais de 70% do seu Orçamento.' })
    }

    const overspentCategories = expenseCategories.filter(cat => cat.spent > cat.estimated)
    if (overspentCategories.length > 0) {
      newAlerts.push({
        type: 'warning',
        message: `📊 ${overspentCategories.length} categorias extrapolaram o Orçamento: ${overspentCategories.map(c => c.category).join(', ')}`
      })
    }

    return newAlerts

}, [totalSpent, totalIncome, budgetPercentage, expenseCategories, settings.alertThreshold])

// Dados para gráficos
const chartData = expenseCategories.map(cat => ({
category: cat.category,
estimativa: cat.estimated,
gasto: cat.spent,
diferenca: cat.spent - cat.estimated
}))

const pieData = expenseCategories
.filter(cat => cat.spent > 0)
.map(cat => ({
name: cat.category,
value: cat.spent,
percentage: totalSpent > 0 ? ((cat.spent / totalSpent) \* 100).toFixed(1) : '0',
color: cat.color
}))

const formatCurrency = (value: number) => {
return new Intl.NumberFormat('pt-BR', {
style: 'currency',
currency: settings.currency
}).format(value)
}

const getDaysUntilDue = (dueDate: string) => {
if (!dueDate) return 999
const today = new Date()
const due = new Date(dueDate)
const diffTime = due.getTime() - today.getTime()
const diffDays = Math.ceil(diffTime / (1000 _ 60 _ 60 \* 24))
return diffDays
}

const getDueDateColor = (dueDate: string) => {
const days = getDaysUntilDue(dueDate)
if (days < 0) return 'text-red-600 bg-red-50'
if (days <= 3) return 'text-orange-600 bg-orange-50'
if (days <= 7) return 'text-yellow-600 bg-yellow-50'
return 'text-green-600 bg-green-50'
}

const getDueDateText = (dueDate: string) => {
const days = getDaysUntilDue(dueDate)
if (days < 0) return `Atrasado (${Math.abs(days)} dias)`
if (days === 0) return 'Vence hoje'
if (days === 1) return 'Vence amanhé£'
return `Vence em ${days} dias`
}

// Funções de atualização
const updateIncomeValue = (id: string, value: string) => {
const cleanValue = value.replace(/[^\d,-]/g, '').replace(',', '.')
const numValue = parseFloat(cleanValue) || 0
setIncomeSources(prev => prev.map(source =>
source.id === id ? { ...source, value: numValue } : source
))
}

const updateExpenseCategory = (id: string, field: 'estimated' | 'spent', value: string) => {
const cleanValue = value.replace(/[^\d,-]/g, '').replace(',', '.')
const numValue = parseFloat(cleanValue) || 0
setExpenseCategories(prev => prev.map(cat =>
cat.id === id ? { ...cat, [field]: numValue } : cat
))
}

const addFixedExpense = () => {
const newExpense: FixedExpense = {
id: Date.now().toString(),
description: '',
category: '',
value: 0,
dueDate: '',
status: 'pendente',
referenceMonth: currentMonth
}
setFixedExpenses(prev => [...prev, newExpense])
}

const updateFixedExpense = (id: string, field: keyof FixedExpense, value: string | number) => {
setFixedExpenses(prev => prev.map(exp => {
if (exp.id !== id) return exp

      if (field === 'value') {
        const cleanValue = typeof value === 'string'
          ? value.replace(/[^\d,-]/g, '').replace(',', '.')
          : value.toString()
        const numValue = parseFloat(cleanValue) || 0
        return { ...exp, [field]: numValue }
      }

      return { ...exp, [field]: value }
    }))

}

// Funções de Cartões
const addNewCard = () => {
if (!newCard.name || !newCard.bank) {
alert('Por favor, preencha o nome e o banco do carté£o')
return
}

    const card: CreditCard = {
      id: Date.now().toString(),
      name: newCard.name,
      bank: newCard.bank,
      color: newCard.color,
      icon: newCard.icon,
      expenses: [],
      isActive: true,
      createdAt: new Date().toISOString()
    }

    setCreditCards(prev => [...prev, card])
    setNewCard({ name: '', bank: '', color: '#3B82F6', icon: 'CreditCard' })
    setShowAddCardDialog(false)

}

const deleteCard = (cardId: string) => {
if (confirm('Tem certeza que deseja excluir este carté£o? Todas as despesas associadas seré£o perdidas.')) {
setCreditCards(prev => prev.filter(card => card.id !== cardId))
}
}

const toggleCardStatus = (cardId: string) => {
setCreditCards(prev => prev.map(card =>
card.id === cardId ? { ...card, isActive: !card.isActive } : card
))
}

const addCardExpense = (cardId: string) => {
const newExpense: CardExpense = {
id: Date.now().toString(),
description: '',
category: '',
value: 0,
dueDate: '',
installment: ''
}

    setCreditCards(prev => prev.map(card =>
      card.id === cardId
        ? { ...card, expenses: [...card.expenses, newExpense] }
        : card
    ))

}

const updateCardExpense = (cardId: string, expenseId: string, field: keyof CardExpense, value: string | number) => {
setCreditCards(prev => prev.map(card => {
if (card.id !== cardId) return card

      return {
        ...card,
        expenses: card.expenses.map(exp => {
          if (exp.id !== expenseId) return exp

          if (field === 'value') {
            const cleanValue = typeof value === 'string'
              ? value.replace(/[^\d,-]/g, '').replace(',', '.')
              : value.toString()
            const numValue = parseFloat(cleanValue) || 0
            return { ...exp, [field]: numValue }
          }

          return { ...exp, [field]: value }
        })
      }
    }))

}

const deleteCardExpense = (cardId: string, expenseId: string) => {
setCreditCards(prev => prev.map(card =>
card.id === cardId
? { ...card, expenses: card.expenses.filter(exp => exp.id !== expenseId) }
: card
))
}

// Funções das funcionalidades principais
const handleCloseMonth = () => {
const cardExpenses: { [cardId: string]: CardExpense[] } = {}
creditCards.forEach(card => {
cardExpenses[card.id] = [...card.expenses]
})

    const monthData: MonthlyData = {
      id: Date.now().toString(),
      month: currentMonth,
      year: new Date().getFullYear(),
      income: totalIncome,
      expenses: totalSpent,
      remaining: remaining,
      categories: [...expenseCategories],
      fixedExpenses: [...fixedExpenses],
      cardExpenses: cardExpenses,
      incomeSources: [...incomeSources],
      closedAt: new Date().toISOString(),
      notes: closeMonthNotes
    }

    setClosedMonths(prev => [...prev, monthData])

    // Resetar dados para o pré³ximo mês
    setExpenseCategories(prev => prev.map(cat => ({ ...cat, spent: 0 })))
    setFixedExpenses([])
    setCreditCards(prev => prev.map(card => ({ ...card, expenses: [] })))
    setCloseMonthNotes('')

    setShowCloseMonthDialog(false)

    // Atualizar para o pré³ximo mês
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    setCurrentMonth(nextMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))

}

const generateReport = () => {
const reportData = {
periodo: currentMonth,
dataGeracao: new Date().toLocaleDateString('pt-BR'),
resumo: {
rendaTotal: totalIncome,
gastosTotais: totalSpent,
saldoRestante: remaining,
percentualUtilizado: budgetPercentage.toFixed(1)
},
categorias: expenseCategories.map(cat => ({
nome: cat.category,
estimado: cat.estimated,
gasto: cat.spent,
diferenca: cat.spent - cat.estimated,
status: cat.spent > cat.estimated ? 'Extrapolado' : cat.spent === 0 ? 'Sem gastos' : 'Dentro do esperado'
})),
cartoes: creditCards.filter(card => card.isActive).map(card => ({
nome: card.name,
banco: card.bank,
total: card.expenses.reduce((sum, exp) => sum + exp.value, 0),
despesas: card.expenses
})),
gastosFixos: fixedExpenses,
mesesFechados: closedMonths.length,
historico: closedMonths.map(month => ({
mes: month.month,
renda: month.income,
gastos: month.expenses,
saldo: month.remaining,
notas: month.notes
}))
}

    // Criar e baixar arquivo JSON
    const dataStr = JSON.stringify(reportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

    const exportFileDefaultName = `relatorio-financeiro-${currentMonth.replace(/\s+/g, '-').toLowerCase()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

}

const generateHistoryReport = () => {
const historyData = {
dataGeracao: new Date().toLocaleDateString('pt-BR'),
totalMeses: closedMonths.length,
resumoGeral: {
rendaTotal: closedMonths.reduce((sum, month) => sum + month.income, 0),
gastosTotais: closedMonths.reduce((sum, month) => sum + month.expenses, 0),
saldoTotal: closedMonths.reduce((sum, month) => sum + month.remaining, 0),
mediaRenda: closedMonths.length > 0 ? closedMonths.reduce((sum, month) => sum + month.income, 0) / closedMonths.length : 0,
mediaGastos: closedMonths.length > 0 ? closedMonths.reduce((sum, month) => sum + month.expenses, 0) / closedMonths.length : 0
},
meses: closedMonths.map(month => ({
mes: month.month,
ano: month.year,
renda: month.income,
gastos: month.expenses,
saldo: month.remaining,
categorias: month.categories,
gastosFixos: month.fixedExpenses,
cartoes: month.cardExpenses,
fontesRenda: month.incomeSources,
dataFechamento: month.closedAt,
notas: month.notes
}))
}

    const dataStr = JSON.stringify(historyData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

    const exportFileDefaultName = `historico-completo-${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

}

const addNewExpense = () => {
const cleanValue = newExpense.value.replace(/[^\d,-]/g, '').replace(',', '.')
const numValue = parseFloat(cleanValue) || 0

    if (!newExpense.description || !newExpense.category || numValue <= 0) {
      alert('Por favor, preencha todos os campos corretamente')
      return
    }

    switch (newExpense.type) {
      case 'category':
        const existingCategory = expenseCategories.find(cat => cat.category === newExpense.category)
        if (existingCategory) {
          setExpenseCategories(prev => prev.map(cat =>
            cat.category === newExpense.category
              ? { ...cat, spent: cat.spent + numValue }
              : cat
          ))
        }
        break

      case 'fixed':
        const newFixedExpense: FixedExpense = {
          id: Date.now().toString(),
          description: newExpense.description,
          category: newExpense.category,
          value: numValue,
          dueDate: new Date().toISOString().split('T')[0],
          status: 'pendente',
          referenceMonth: currentMonth
        }
        setFixedExpenses(prev => [...prev, newFixedExpense])
        break

      case 'card':
        if (!newExpense.cardId) {
          alert('Selecione um carté£o')
          return
        }
        const newCardExpense: CardExpense = {
          id: Date.now().toString(),
          description: newExpense.description,
          category: newExpense.category,
          value: numValue,
          dueDate: new Date().toISOString().split('T')[0]
        }
        setCreditCards(prev => prev.map(card =>
          card.id === newExpense.cardId
            ? { ...card, expenses: [...card.expenses, newCardExpense] }
            : card
        ))
        break
    }

    setNewExpense({ description: '', category: '', value: '', type: 'category', cardId: '' })
    setShowAddExpenseDialog(false)

}

const deleteHistoryMonth = (monthId: string) => {
if (confirm('Tem certeza que deseja excluir este mês do histé³rico? Esta ação né£o pode ser desfeita.')) {
setClosedMonths(prev => prev.filter(month => month.id !== monthId))
}
}

const getStatusBadge = (status: string) => {
switch (status) {
case 'pago':
return <Badge className="bg-green-100 text-green-800">✓ Pago</Badge>
case 'pendente':
return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pendente</Badge>
case 'atrasado':
return <Badge className="bg-red-100 text-red-800">âš ï¸ Atrasado</Badge>
default:
return <Badge variant="outline">Desconhecido</Badge>
}
}

const getSpendingStatus = (spent: number, estimated: number) => {
if (spent === 0) return { color: 'text-gray-500', bg: 'bg-gray-50', text: 'Sem gastos' }
if (spent > estimated) return { color: 'text-red-600', bg: 'bg-red-50', text: 'Extrapolou' }
return { color: 'text-green-600', bg: 'bg-green-50', text: 'Dentro do esperado' }
}

return (
<div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50">
<AuthHeader />

      {/* Cabeé§alho Principal Moderno */}
      <Card className="mb-8 border-0 shadow-xl bg-linear-to-br from-purple-400 via-pink-400 to-blue-400 text-white mx-4 mt-4">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-4xl md:text-5xl font-bold tracking-wide">
            Controle Financeiro
          </CardTitle>
          <p className="text-xl opacity-90 mt-2">{currentMonth}</p>
        </CardHeader>
      </Card>

      {/* Painel Resumo (Dashboard) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8 px-4">
        <Card className="border-0 shadow-lg bg-linear-to-br from-green-400 to-green-500 text-white">
          <CardContent className="p-6 text-center">
            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90">Renda Bruta</p>
            <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-linear-to-br from-red-400 to-red-500 text-white">
          <CardContent className="p-6 text-center">
            <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90">Total Gastos</p>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-linear-to-br from-blue-400 to-blue-500 text-white">
          <CardContent className="p-6 text-center">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90">Cartões</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCards)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-linear-to-br from-purple-400 to-purple-500 text-white">
          <CardContent className="p-6 text-center">
            <PiggyBank className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90">Sobra Final</p>
            <p className="text-2xl font-bold">{formatCurrency(remaining)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-linear-to-br from-orange-400 to-orange-500 text-white">
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90">% Orçamento</p>
            <p className="text-2xl font-bold">{budgetPercentage.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-linear-to-br from-pink-400 to-pink-500 text-white">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-90">Top Categoria</p>
            <p className="text-lg font-bold truncate">{topCategory.category}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Inteligentes */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2 px-4">
          {alerts.map((alert, index) => (
            <Card key={index} className={`border-l-4 ${alert.type === 'error' ? 'border-red-500 bg-red-50' :
              alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
              <CardContent className="p-4">
                <p className={`font-medium ${alert.type === 'error' ? 'text-red-800' :
                  alert.type === 'warning' ? 'text-yellow-800' :
                    'text-blue-800'
                  }`}>
                  {alert.message}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Barra de Progresso do Orçamento */}
      <Card className="mb-8 border-0 shadow-lg mx-4">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Progresso do Orçamento</h3>
            <span className="text-sm text-gray-600">{budgetPercentage.toFixed(1)}% utilizado</span>
          </div>
          <Progress
            value={Math.min(budgetPercentage, 100)}
            className={`h-4 ${budgetPercentage > 90 ? 'bg-red-200' :
              budgetPercentage > 70 ? 'bg-yellow-200' :
                'bg-green-200'
              }`}
          />
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>{formatCurrency(0)}</span>
            <span>{formatCurrency(totalIncome)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
        {/* Fontes de Renda Modernizado */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="bg-linear-to-br from-blue-100 to-blue-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-blue-900">
              <div className="p-2 bg-blue-500 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              Fontes de Renda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-blue-900">Descrição</TableHead>
                  <TableHead className="text-right text-blue-900">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeSources.map((source) => (
                  <TableRow key={source.id} className="hover:bg-blue-50/50 transition-colors">
                    <TableCell className="font-medium text-gray-700">{source.description}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="text"
                        value={formatCurrency(source.value)}
                        onChange={(e) => updateIncomeValue(source.id, e.target.value)}
                        className="text-right font-mono border-blue-200 focus:border-blue-400"
                        placeholder="R$ 0,00"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-linear-to-br from-blue-100 to-blue-200 font-bold">
                  <TableCell className="text-blue-900">Total de Rendas</TableCell>
                  <TableCell className="text-right text-blue-900 text-lg">
                    {formatCurrency(totalIncome)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Estimativas e Gastos por Categoria Modernizado */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="bg-linear-to-br from-green-100 to-green-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-green-900">
              <div className="p-2 bg-green-500 rounded-lg">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              Estimativas e Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-green-900">Categoria</TableHead>
                    <TableHead className="text-right text-green-900">Estimativa</TableHead>
                    <TableHead className="text-right text-green-900">Gasto</TableHead>
                    <TableHead className="text-center text-green-900">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseCategories.map((cat) => {
                    const status = getSpendingStatus(cat.spent, cat.estimated)
                    return (
                      <TableRow key={cat.id} className={`hover:bg-green-50/50 transition-colors ${status.bg}`}>
                        <TableCell className="font-medium">
                          <Badge
                            variant="outline"
                            className="border-2"
                            style={{
                              backgroundColor: cat.color,
                              borderColor: cat.color,
                              color: '#374151'
                            }}
                          >
                            {cat.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="text"
                            value={formatCurrency(cat.estimated)}
                            onChange={(e) => updateExpenseCategory(cat.id, 'estimated', e.target.value)}
                            className="text-right font-mono text-sm border-green-200 focus:border-green-400"
                            placeholder="R$ 0,00"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="text"
                            value={formatCurrency(cat.spent)}
                            onChange={(e) => updateExpenseCategory(cat.id, 'spent', e.target.value)}
                            className={`text-right font-mono text-sm border-green-200 focus:border-green-400 ${status.color} font-semibold`}
                            placeholder="R$ 0,00"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={status.bg + ' ' + status.color}>
                            {status.text}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Total Estimado</p>
                <p className="font-bold text-blue-900 text-lg">{formatCurrency(totalEstimated)}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Total Gastos</p>
                <p className="font-bold text-red-900 text-lg">{formatCurrency(totalSpent)}</p>
              </div>
              <div className={`p-3 rounded-lg ${difference >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-sm text-gray-600">Diferença</p>
                <p className={`font-bold text-lg ${difference >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {formatCurrency(difference)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gré¡fico Comparativo Melhorado */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="bg-linear-to-br from-purple-100 to-purple-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-purple-900">
              <div className="p-2 bg-purple-500 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              Análise Comparativa: Estimativas vs Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={11}
                  tick={{ fill: '#4B5563' }}
                />
                <YAxis tick={{ fill: '#4B5563' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar
                  dataKey="estimativa"
                  fill="#93C5FD"
                  name="Estimativas"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="gasto"
                  fill="#FCA5A5"
                  name="Gastos Reais"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza Melhorado */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="bg-linear-to-br from-pink-100 to-pink-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-pink-900">
              <div className="p-2 bg-pink-500 rounded-lg">
                <PiggyBank className="h-6 w-6 text-white" />
              </div>
              Distribuição dos Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {pieData.slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(item.value)} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gastos Fixos Melhorado */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="bg-linear-to-br from-orange-100 to-orange-200 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-orange-900">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              Gastos Fixos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-orange-900">Descrição</TableHead>
                    <TableHead className="text-orange-900">Categoria</TableHead>
                    <TableHead className="text-orange-900">Vencimento</TableHead>
                    <TableHead className="text-center text-orange-900">Status</TableHead>
                    <TableHead className="text-right text-orange-900">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-orange-50/50 transition-colors">
                      <TableCell>
                        <Input
                          value={expense.description}
                          onChange={(e) => updateFixedExpense(expense.id, 'description', e.target.value)}
                          placeholder="Descrição"
                          className="text-sm border-orange-200 focus:border-orange-400"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={expense.category} onValueChange={(value) => updateFixedExpense(expense.id, 'category', value)}>
                          <SelectTrigger className="text-sm border-orange-200 focus:border-orange-400">
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={expense.dueDate}
                          onChange={(e) => updateFixedExpense(expense.id, 'dueDate', e.target.value)}
                          className="text-sm border-orange-200 focus:border-orange-400"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(expense.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="text"
                          value={formatCurrency(expense.value)}
                          onChange={(e) => updateFixedExpense(expense.id, 'value', e.target.value)}
                          className="text-right font-mono text-sm border-orange-200 focus:border-orange-400"
                          placeholder="R$ 0,00"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center mt-4">
              <Button
                onClick={addFixedExpense}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Gasto Fixo
              </Button>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Gastos Fixos</p>
                <p className="font-bold text-orange-900 text-lg">{formatCurrency(totalFixedExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cartões Diné¢micos */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur lg:col-span-2">
          <CardHeader className="bg-linear-to-br from-indigo-100 to-indigo-200 rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                Cartões de Crédito
              </div>
              <Button
                onClick={() => setShowAddCardDialog(true)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cartão
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Gré¡fico dos Cartões */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-4 text-indigo-900">Distribuição por Cartão</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cardChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" tick={{ fill: '#4B5563' }} />
                  <YAxis tick={{ fill: '#4B5563' }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#818CF8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Lista de Cartões */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {creditCards.filter(card => card.isActive).map((card) => (
                <div key={card.id}>
                  <div className="flex justify-between items-center mb-3 p-3 rounded-lg" style={{ backgroundColor: card.color + '20' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{renderIcon(card.icon)}</span>
                      <div>
                        <h4 className="font-semibold" style={{ color: card.color }}>
                          {card.name}
                        </h4>
                        <p className="text-xs text-gray-600">{card.bank}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold" style={{ color: card.color }}>
                          {formatCurrency(card.expenses.reduce((sum, exp) => sum + exp.value, 0))}
                        </p>
                        <p className="text-xs text-gray-600">
                          {cardChartData.find(c => c.name === card.name)?.percentage.toFixed(1)}% do total
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCardStatus(card.id)}
                          className="h-8 w-8 p-0"
                        >
                          {card.isActive ? <Eye /> : <EyeOff />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteCard(card.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Descrição</TableHead>
                          <TableHead className="text-xs">Categoria</TableHead>
                          <TableHead className="text-xs">Venc.</TableHead>
                          <TableHead className="text-xs">Parcela</TableHead>
                          <TableHead className="text-xs text-right">Valor</TableHead>
                          <TableHead className="text-xs"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {card.expenses.map((expense) => (
                          <TableRow key={expense.id} className="hover:bg-gray-50/30">
                            <TableCell>
                              <Input
                                value={expense.description}
                                onChange={(e) => updateCardExpense(card.id, expense.id, 'description', e.target.value)}
                                placeholder="Descrição"
                                className="text-xs h-8 border-gray-200"
                              />
                            </TableCell>
                            <TableCell>
                              <Select value={expense.category} onValueChange={(value) => updateCardExpense(card.id, expense.id, 'category', value)}>
                                <SelectTrigger className="text-xs h-8 border-gray-200">
                                  <SelectValue placeholder="Cat" />
                                </SelectTrigger>
                                <SelectContent>
                                  {settings.categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={expense.dueDate}
                                onChange={(e) => updateCardExpense(card.id, expense.id, 'dueDate', e.target.value)}
                                className="text-xs h-8 border-gray-200"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={expense.installment || ''}
                                onChange={(e) => updateCardExpense(card.id, expense.id, 'installment', e.target.value)}
                                placeholder="1/12"
                                className="text-xs h-8 border-gray-200"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="text"
                                value={formatCurrency(expense.value)}
                                onChange={(e) => updateCardExpense(card.id, expense.id, 'value', e.target.value)}
                                className="text-right font-mono text-xs h-8 border-gray-200"
                                placeholder="R$ 0,00"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteCardExpense(card.id, expense.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button
                    onClick={() => addCardExpense(card.id)}
                    className="mt-3 w-full"
                    style={{ backgroundColor: card.color }}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Despesa
                  </Button>
                </div>
              ))}
            </div>

            {/* Cartões Inativos */}
            {creditCards.filter(card => !card.isActive).length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">Cartões Inativos</h4>
                <div className="flex gap-2 flex-wrap">
                  {creditCards.filter(card => !card.isActive).map((card) => (
                    <Badge
                      key={card.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleCardStatus(card.id)}
                    >
                      <span className="mr-1">{renderIcon(card.icon, 'h-3 w-3 inline')}</span> {card.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barra de Ações */}
      <Card className="mt-8 border-0 shadow-xl bg-linear-to-r from-gray-100 to-gray-200 mx-4 mb-4">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 justify-center">
            {/* Adicionar Novo Gasto */}
            <Dialog open={showAddExpenseDialog} onOpenChange={setShowAddExpenseDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Novo Gasto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Gasto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Descrição
                    </Label>
                    <Input
                      id="description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                      className="col-span-3"
                      placeholder="Ex: Cinema no shopping"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">
                      Categoria
                    </Label>
                    <Select value={newExpense.category} onValueChange={(value) => setNewExpense(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="value" className="text-right">
                      Valor
                    </Label>
                    <Input
                      id="value"
                      value={newExpense.value}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, value: e.target.value }))}
                      className="col-span-3"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">
                      Tipo
                    </Label>
                    <Select value={newExpense.type} onValueChange={(value: any) => setNewExpense(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="category">Categoria</SelectItem>
                        <SelectItem value="fixed">Gasto Fixo</SelectItem>
                        <SelectItem value="card">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newExpense.type === 'card' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="cardId" className="text-right">
                        Cartão
                      </Label>
                      <Select value={newExpense.cardId} onValueChange={(value) => setNewExpense(prev => ({ ...prev, cardId: value }))}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o Cartão" />
                        </SelectTrigger>
                        <SelectContent>
                          {creditCards.filter(c => c.isActive).map((card) => (
                            <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddExpenseDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={addNewExpense}>
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Botões de ação adicionais */}
            <Button onClick={() => setShowCloseMonthDialog(true)} className="bg-purple-500 hover:bg-purple-600 text-white">
              <Save className="h-4 w-4 mr-2" />
              Fechar Mês
            </Button>

            <Button onClick={generateReport} className="bg-green-500 hover:bg-green-600 text-white">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>

            <Button onClick={() => setShowHistoryDialog(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white">
              <History className="h-4 w-4 mr-2" />
              Ver Histórico
            </Button>

            <Button onClick={() => setShowSettingsDialog(true)} className="bg-gray-500 hover:bg-gray-600 text-white">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Adicionar Cartão */}
      <Dialog open={showAddCardDialog} onOpenChange={setShowAddCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cartão</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardName" className="text-right">Nome</Label>
              <Input
                id="cardName"
                value={newCard.name}
                onChange={(e) => setNewCard(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="Ex: Nubank"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardBank" className="text-right">Banco</Label>
              <Input
                id="cardBank"
                value={newCard.bank}
                onChange={(e) => setNewCard(prev => ({ ...prev, bank: e.target.value }))}
                className="col-span-3"
                placeholder="Ex: Nubank"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardColor" className="text-right">Cor</Label>
              <Select value={newCard.color} onValueChange={(value) => setNewCard(prev => ({ ...prev, color: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }} />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddCardDialog(false)}>Cancelar</Button>
            <Button onClick={addNewCard}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

)
}
