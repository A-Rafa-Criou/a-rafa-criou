import { Suspense } from 'react';
import { db } from '@/lib/db';
import { affiliateCommissions, affiliates, orders } from '@/lib/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Comissões de Afiliados | Dashboard Financeiro',
  description: 'Gerenciamento de comissões de afiliados',
};

async function getCommissionStats() {
  const stats = await db
    .select({
      status: affiliateCommissions.status,
      total: sql<number>`COALESCE(SUM(${affiliateCommissions.commissionAmount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(affiliateCommissions)
    .groupBy(affiliateCommissions.status);

  return {
    pending: stats.find((s) => s.status === 'pending') || { total: 0, count: 0 },
    approved: stats.find((s) => s.status === 'approved') || { total: 0, count: 0 },
    paid: stats.find((s) => s.status === 'paid') || { total: 0, count: 0 },
    cancelled: stats.find((s) => s.status === 'cancelled') || { total: 0, count: 0 },
  };
}

async function getRecentCommissions() {
  return await db
    .select({
      id: affiliateCommissions.id,
      commissionAmount: affiliateCommissions.commissionAmount,
      commissionRate: affiliateCommissions.commissionRate,
      orderTotal: affiliateCommissions.orderTotal,
      status: affiliateCommissions.status,
      createdAt: affiliateCommissions.createdAt,
      affiliateName: affiliates.name,
      affiliateEmail: affiliates.email,
      affiliateType: affiliates.affiliateType,
      orderId: orders.id,
    })
    .from(affiliateCommissions)
    .leftJoin(affiliates, eq(affiliateCommissions.affiliateId, affiliates.id))
    .leftJoin(orders, eq(affiliateCommissions.orderId, orders.id))
    .orderBy(desc(affiliateCommissions.createdAt))
    .limit(50);
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(value: number | string | null) {
  const numValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
  return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusBadge(status: string) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const labels = {
    pending: 'Pendente',
    approved: 'Aprovada',
    paid: 'Paga',
    cancelled: 'Cancelada',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

function getAffiliateTypeBadge(type: string | null) {
  if (!type) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">N/A</span>;
  
  return type === 'commercial_license' ? (
    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
      Licença Comercial
    </span>
  ) : (
    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
      Comum
    </span>
  );
}

export default async function ComissoesPage() {
  const [stats, commissions] = await Promise.all([
    getCommissionStats(),
    getRecentCommissions(),
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
          <h1 className="text-3xl font-bold text-gray-900">Comissões de Afiliados</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de comissões</p>
        </div>
      </div>

      {/* Stats por Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Pendentes</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(stats.pending.total)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{stats.pending.count} comissões</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Aprovadas</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(stats.approved.total)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{stats.approved.count} comissões</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Pagas</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.paid.total)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{stats.paid.count} comissões</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Canceladas</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(stats.cancelled.total)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{stats.cancelled.count} comissões</p>
        </div>
      </div>

      {/* Tabela de Comissões */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Comissões Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Afiliado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido (ID)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Venda
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxa
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comissão
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commissions.map((comm) => (
                <tr key={comm.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(comm.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium">{comm.affiliateName}</div>
                    <div className="text-gray-500 text-xs">{comm.affiliateEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getAffiliateTypeBadge(comm.affiliateType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {comm.orderId?.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(comm.orderTotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                    {comm.commissionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {formatCurrency(comm.commissionAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {getStatusBadge(comm.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {commissions.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhuma comissão encontrada.
          </div>
        )}
      </div>
    </div>
  );
}
