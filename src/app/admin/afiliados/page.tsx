import { Metadata } from 'next';
import AffiliatesPageClient from '@/components/admin/AffiliatesPageClient';

export const metadata: Metadata = {
    title: 'Afiliados | Admin',
    description: 'Gerenciar programa de afiliados',
};

export default function AffiliatesPage() {
    return <AffiliatesPageClient />;
}
