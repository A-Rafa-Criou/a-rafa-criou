import { Suspense } from 'react';
import { db } from '@/lib/db';
import { affiliates, affiliateCommissions } from '@/lib/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Afiliados | Dashboard Financeiro',
  description: 'Visão geral dos afiliados',
};

async function getAffiliateStats() {
  const stats = await db
    .select({
      type: affiliates.affiliateType,
      status: affiliates.status,
      count: sql<number>`COUNT(*)`,
      totalRevenue: sql<number>`COALESCE(SUM(${affiliates.totalRevenue}), 0)`,
      totalCommission: sql<number>`COALESCE(SUM(${affiliates.totalCommission}), 0)`,
      pendingCommission: sql<number>`COALESCE(SUM(${affiliates.pendingCommission}), 0)`,
    })
    .from(affiliates)
    .groupBy(affiliates.affiliateType, affiliates.status);

  return stats;
}

async function getTopAffiliates() {
  return await db
    .select({
      id: affiliates.id,
      name: affiliates.name,
      email: affiliates.email,
      affiliateType: affiliates.affiliateType,
      status: affiliates.status,
      totalRevenue: affiliates.totalRevenue,
      totalCommission: affiliates.totalCommission,
      pendingCommission: affiliates.pendingCommission,
      paidCommission: affiliates.paidCommission,
      totalOrders: affiliates.totalOrders,
      totalClicks: affiliates.totalClicks,
    })
    .from(affiliates)
    .orderBy(desc(affiliates.totalRevenue))
    .limit(20);
}

function formatCurrency(value: number | string | null) {
  const numValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
  return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusBadge(status: string) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800',
  };

  const labels = {
    active: 'Ativo',
    pending: 'Pendente',
    suspended: 'Suspenso',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

function getTypeBadge(type: string) {
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

export default async function AfiliadosPage() {
  const [stats, topAffiliates] = await Promise.all([
    getAffiliateStats(),
    getTopAffiliates(),
  ]);

  // Calcular totais
  const commonActive = stats.filter(
    (s: typeof stats[0]) => s.type === 'common' && s.status === 'active'
  );
  const licenseActive = stats.filter(
    (s: typeof stats[0]) => s.type === 'commercial_license' && s.status === 'active'
  );

  const totalCommonActive = commonActive.reduce((acc: number, s: typeof stats[0]) => acc + Number(s.count), 0);
  const totalLicenseActive = licenseActive.reduce((acc: number, s: typeof stats[0]) => acc + Number(s.count), 0);

  const totalRevenue = stats.reduce((acc: number, s: typeof stats[0]) => acc + Number(s.totalRevenue), 0);
  const totalPending = stats.reduce((acc: number, s: typeof stats[0]) => acc + Number(s.pendingCommission), 0);

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
          <h1 className="text-3xl font-bold text-gray-900">Afiliados</h1>
          <p className="text-gray-600 mt-1">Visão geral e desempenho</p>
        </div>
      </div>

      {/* Stats Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Afiliados Comuns</h3>
          <p className="text-3xl font-bold text-blue-600">{totalCommonActive}</p>
          <Link
            href="/admin/financeiro/afiliados/comum"
            className="text-sm text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
          >
            Ver detalhes <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Licenças Comerciais</h3>
          <p className="text-3xl font-bold text-purple-600">{totalLicenseActive}</p>
          <Link
            href="/admin/financeiro/afiliados/licenca"
            className="text-sm text-purple-600 hover:underline mt-2 inline-flex items-center gap-1"
          >
            Ver detalhes <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Receita Total Gerada</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-gray-600 text-sm mb-2">Comissões Pendentes</h3>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Top Afiliados */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Top Afiliados por Receita</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Afiliado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliques
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receita Gerada
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comissão Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pendente
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topAffiliates.map((aff: typeof topAffiliates[0]) => (
                <tr key={aff.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium">{aff.name}</div>
                    <div className="text-gray-500 text-xs">{aff.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getTypeBadge(aff.affiliateType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {getStatusBadge(aff.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {aff.totalClicks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {aff.totalOrders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                    {formatCurrency(aff.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {formatCurrency(aff.totalCommission)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600">
                    {formatCurrency(aff.pendingCommission)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                    {formatCurrency(aff.paidCommission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {topAffiliates.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhum afiliado encontrado.
          </div>
        )}
      </div>

      {/* Links Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/financeiro/afiliados/comum"
          className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-500"
        >
          <h3 className="font-semibold text-gray-900 mb-1">Afiliados Comuns</h3>
          <p className="text-sm text-gray-600">Ver lista completa e histórico</p>
        </Link>

        <Link
          href="/admin/financeiro/afiliados/licenca"
          className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-purple-500"
        >
          <h3 className="font-semibold text-gray-900 mb-1">Licenças Comerciais</h3>
          <p className="text-sm text-gray-600">Acessos temporários e vendas</p>
        </Link>

        <Link
          href="/admin/financeiro/afiliados/acessos"
          className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-[#FD9555]"
        >
          <h3 className="font-semibold text-gray-900 mb-1">Acessos Ativos</h3>
          <p className="text-sm text-gray-600">Arquivos temporários (5 dias)</p>
        </Link>
      </div>
    </div>
  );
}
