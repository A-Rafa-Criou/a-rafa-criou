import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pedidos | Admin - A Rafa Criou',
  description: 'Gerenciamento de pedidos e vendas de produtos digitais',
  robots: 'noindex, nofollow', // Admin não deve ser indexado
};

export default function OrdersAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
