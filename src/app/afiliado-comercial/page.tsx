import { Metadata } from 'next';
import CommercialLicenseDashboard from '@/components/affiliates/CommercialLicenseDashboardNew';

export const metadata: Metadata = {
    title: 'Dashboard Licença Comercial',
    description: 'Acesse seus arquivos e gerencie seus links',
};

export default function AffiliateCommercialDashboardPage() {
    return <CommercialLicenseDashboard />;
}
