import { Metadata } from 'next';
import CommissionsPageClient from '@/components/admin/CommissionsPageClient';

export const metadata: Metadata = {
    title: 'Comissões de Afiliados | Admin',
    description: 'Gerenciar comissões de afiliados',
};

export default function CommissionsPage() {
    return <CommissionsPageClient />;
}
