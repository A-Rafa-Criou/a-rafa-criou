import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/config';
import Link from 'next/link';
import { Home, Store, User, TrendingUp, PiggyBank, Users } from 'lucide-react';

const ALLOWED_EMAIL = 'arafacriou@gmail.com';

export default async function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Bloquear TODOS exceto o email específico
  if (!session || session.user?.email !== ALLOWED_EMAIL) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link
                href="/admin/financeiro"
                className="flex items-center space-x-2 font-semibold text-lg"
              >
                <TrendingUp className="w-6 h-6 text-[#FD9555]" />
                <span>Financeiro</span>
              </Link>

              <nav className="hidden md:flex space-x-6">
                <Link
                  href="/admin/financeiro"
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
                >
                  <Home className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/admin/financeiro/loja/entradas"
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
                >
                  <Store className="w-4 h-4" />
                  <span>Loja</span>
                </Link>
                <Link
                  href="/admin/financeiro/pessoal/despesas-fixas"
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
                >
                  <User className="w-4 h-4" />
                  <span>Pessoal</span>
                </Link>
                <Link
                  href="/admin/financeiro/fundos/contas-anuais"
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
                >
                  <PiggyBank className="w-4 h-4" />
                  <span>Fundos</span>
                </Link>
                <Link
                  href="/admin/financeiro/afiliados"
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
                >
                  <Users className="w-4 h-4" />
                  <span>Afiliados</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {session.user?.name || session.user?.email}
              </div>
              <Link
                href="/admin"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Voltar ao Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            🔒 Área restrita - Acesso exclusivo financeiro
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
