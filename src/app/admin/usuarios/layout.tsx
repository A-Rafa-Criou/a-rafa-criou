import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Usuários | Admin - A Rafa Criou',
    description: 'Gerenciamento de usuários e clientes',
    robots: 'noindex, nofollow',
};

export default function UsersAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
