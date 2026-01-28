import { Metadata } from 'next';
import AffiliateDashboard from '@/components/affiliates/AffiliateDashboardNew';

export const metadata: Metadata = {
    title: 'Dashboard do Afiliado',
    description: 'Acompanhe suas comissões e links de afiliado',
};

export default function AffiliateCommonDashboardPage() {
    return <AffiliateDashboard />;
}
