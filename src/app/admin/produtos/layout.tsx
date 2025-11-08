import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Produtos | Admin - A Rafa Criou',
  description: 'Gerenciamento de produtos digitais - PDFs teocráticos para Testemunhas de Jeová',
  robots: 'noindex, nofollow', // Admin não deve ser indexado
};

export default function ProductsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
