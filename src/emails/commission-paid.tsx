import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
} from '@react-email/components';

interface CommissionPaidEmailProps {
    affiliateName: string;
    commissionAmount: string;
    currency: string;
    paymentMethod: string;
    orderId: string;
    notes?: string;
}

export default function CommissionPaidEmail({
    affiliateName,
    commissionAmount,
    currency,
    paymentMethod,
    orderId,
    notes,
}: CommissionPaidEmailProps) {
    const currencySymbols: Record<string, string> = {
        BRL: 'R$',
        USD: '$',
        EUR: '€',
        MXN: 'MXN$',
    };

    const paymentMethodLabels: Record<string, string> = {
        pix: 'PIX',
        bank_transfer: 'Transferência Bancária',
    };

    const symbol = currencySymbols[currency] || 'R$';
    const methodLabel = paymentMethodLabels[paymentMethod] || paymentMethod;

    return (
        <Html>
            <Head />
            <Preview>Comissão de {symbol} {commissionAmount} paga</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>💰 Comissão Paga!</Heading>

                    <Text style={text}>Olá {affiliateName},</Text>

                    <Text style={text}>
                        Sua comissão foi <strong>paga com sucesso</strong>! 🎉
                    </Text>

                    <Section style={infoCard}>
                        <Text style={infoLabel}>Valor da Comissão:</Text>
                        <Text style={infoValue}>
                            {symbol} {commissionAmount}
                        </Text>

                        <Text style={infoLabel}>Método de Pagamento:</Text>
                        <Text style={infoValue}>{methodLabel}</Text>

                        <Text style={infoLabel}>Referente ao Pedido:</Text>
                        <Text style={infoValue}>#{orderId.slice(0, 8)}</Text>

                        {notes && (
                            <>
                                <Text style={infoLabel}>Observações:</Text>
                                <Text style={infoValue}>{notes}</Text>
                            </>
                        )}
                    </Section>

                    <Text style={text}>
                        O pagamento deve aparecer em sua conta em até <strong>24 horas</strong>.
                    </Text>

                    <Text style={text}>
                        Continue promovendo nossos produtos e ganhando comissões! 💪
                    </Text>

                    <Text style={footer}>
                        A Rafa Criou - Programa de Afiliados
                        <br />
                        Se tiver dúvidas, responda este e-mail.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
};

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '40px 0',
    padding: '0 24px',
    textAlign: 'center' as const,
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '26px',
    padding: '0 24px',
};

const infoCard = {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 24px',
};

const infoLabel = {
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '600',
    margin: '12px 0 4px 0',
};

const infoValue = {
    color: '#111827',
    fontSize: '16px',
    fontWeight: '500',
    margin: '0 0 8px 0',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
    marginTop: '32px',
    padding: '0 24px',
};
