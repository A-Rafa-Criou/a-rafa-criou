import { Metadata } from 'next';
import AffiliateApplicationForm from '@/components/affiliates/AffiliateApplicationForm';

export const metadata: Metadata = {
    title: 'Seja um Afiliado',
    description: 'Candidate-se para ser um afiliado e ganhe comissões por cada venda',
};

export default function AffiliateApplicationPage() {
    return <AffiliateApplicationForm />;
}
