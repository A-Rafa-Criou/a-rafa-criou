import { Metadata } from 'next';
import AffiliateLandingClient from '@/components/affiliates/AffiliateLandingClient';

export const metadata: Metadata = {
    title: 'Afiliados da Rafa - Escolha seu Plano',
    description:
        'Torne-se um afiliado da Rafa e ganhe comissões ou acesse nossos produtos com licença comercial',
};

export default function AfiliadosDaRafaPage() {
    return <AffiliateLandingClient />;
}
