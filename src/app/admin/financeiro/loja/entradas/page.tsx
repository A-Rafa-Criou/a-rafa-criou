import { Suspense } from 'react';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { desc, eq, and, gte, lt, sql } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Entradas - Loja | Dashboard Financeiro',
  description: 'Receitas e vendas da loja',
};

async function getMonthlyRevenue() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'completed'),
        gte(orders.createdAt, startOfMonth),
        lt(orders.createdAt, startOfNextMonth)
      )
    );

  return result[0] || { total: 0, count: 0 };
}

async function getRecentOrders() {
  return await db
    .select({
      id: orders.id,
      totalAmount: orders.total,
      paymentMethod: orders.paymentProvider,
      createdAt: orders.createdAt,
      userEmail: orders.email,
    })
    .from(orders)
    .where(eq(orders.status, 'completed'))
    .orderBy(desc(orders.createdAt))
    .limit(50);
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number | string | null) {
  const numValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
  return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function EntradasPage() {
  const [monthStats, recentOrders] = await Promise.all([
    getMonthlyRevenue(),
    getRecentOrders(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/financeiro"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entradas - Loja</h1>
          <p className="text-gray-600 mt-1">Receitas e vendas completadas</p>
        </div>
      </div>

      {/* Stats do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Total do Mês</h3>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(monthStats.total)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Vendas do Mês</h3>
          <p className="text-3xl font-bold text-blue-600">{monthStats.count}</p>
        </div>
      </div>

      {/* Tabela de Vendas Recentes */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Vendas Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID do Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.userEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.paymentMethod === 'mercado_pago' && 'Mercado Pago'}
                    {order.paymentMethod === 'stripe' && 'Stripe'}
                    {order.paymentMethod === 'paypal' && 'PayPal'}
                    {order.paymentMethod === 'pix' && 'PIX'}
                    {!['mercado_pago', 'stripe', 'paypal', 'pix'].includes(
                      order.paymentMethod || ''
                    ) && (order.paymentMethod || 'N/A')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentOrders.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhuma venda encontrada neste mês.
          </div>
        )}
      </div>
    </div>
  );
}
