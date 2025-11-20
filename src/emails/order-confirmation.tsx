import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Button,
} from '@react-email/components';

interface OrderConfirmationEmailProps {
    customerName: string;
    orderId: string;
    orderTotal: string;
    orderItems: Array<{
        name: string;
        quantity: number;
        price: string;
    }>;
    orderUrl: string;
}

export default function OrderConfirmationEmail({
    customerName = 'Cliente',
    orderId = 'ABC123',
    orderTotal = 'R$ 0,00',
    orderItems = [],
    orderUrl = '#',
}: OrderConfirmationEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Seu pedido #{orderId} foi confirmado! 🎉</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Logo */}
                    <Section style={logoSection}>
                        <Img
                            src={`${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`}
                            width="120"
                            height="auto"
                            alt="A Rafa Criou"
                            style={logo}
                        />
                    </Section>

                    {/* Header */}
                    <Heading style={h1}>Pedido Confirmado! 🎉</Heading>

                    <Text style={text}>Olá, {customerName}!</Text>

                    <Text style={text}>
                        Recebemos seu pedido <strong>#{orderId}</strong> e já estamos processando o pagamento.
                        Assim que for aprovado, você receberá o link para download dos seus PDFs.
                    </Text>

                    {/* Order Items */}
                    <Section style={orderSection}>
                        <Heading as="h2" style={h2}>
                            Itens do Pedido
                        </Heading>
                        {orderItems.map((item, index) => (
                            <div key={index} style={orderItem}>
                                <Text style={itemName}>{item.name}</Text>
                                <Text style={itemDetails}>
                                    Quantidade: {item.quantity} • Valor: {item.price}
                                </Text>
                            </div>
                        ))}
                        <div style={totalSection}>
                            <Text style={totalText}>
                                <strong>Total:</strong> {orderTotal}
                            </Text>
                        </div>
                    </Section>

                    {/* CTA Button */}
                    <Section style={buttonSection}>
                        <Button href={orderUrl} style={button}>
                            Ver Detalhes do Pedido
                        </Button>
                    </Section>

                    {/* Info */}
                    <Section style={infoSection}>
                        <Text style={infoText}>
                            ℹ️ O processamento do pagamento pode levar alguns minutos. Você receberá um email
                            assim que seu download estiver disponível.
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            Dúvidas? Entre em contato conosco em{' '}
                            <Link href={`mailto:${process.env.RESEND_REPLY_TO_EMAIL}`} style={link}>
                                {process.env.RESEND_REPLY_TO_EMAIL}
                            </Link>
                        </Text>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} A Rafa Criou. Todos os direitos reservados.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const main = {
    backgroundColor: '#f4f4f4',
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
};

const logoSection = {
    padding: '32px 20px',
    textAlign: 'center' as const,
    backgroundColor: '#fed466',
};

const logo = {
    margin: '0 auto',
};

const h1 = {
    color: '#171717',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '40px 20px 20px',
    padding: '0',
    textAlign: 'center' as const,
};

const h2 = {
    color: '#171717',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 16px',
};

const text = {
    color: '#171717',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '16px 20px',
};

const orderSection = {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px',
};

const orderItem = {
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '12px',
    marginBottom: '12px',
};

const itemName = {
    color: '#171717',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 4px',
};

const itemDetails = {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0',
};

const totalSection = {
    borderTop: '2px solid #171717',
    paddingTop: '12px',
    marginTop: '12px',
};

const totalText = {
    color: '#171717',
    fontSize: '18px',
    margin: '0',
    textAlign: 'right' as const,
};

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 20px',
};

const button = {
    backgroundColor: '#fed466',
    borderRadius: '8px',
    color: '#171717',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 32px',
};

const infoSection = {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '16px',
    margin: '20px',
};

const infoText = {
    color: '#78350f',
    fontSize: '14px',
    margin: '0',
    lineHeight: '20px',
};

const footer = {
    borderTop: '1px solid #e5e7eb',
    margin: '32px 20px 0',
    paddingTop: '24px',
};

const footerText = {
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: '20px',
    margin: '4px 0',
    textAlign: 'center' as const,
};

const link = {
    color: '#fd9555',
    textDecoration: 'underline',
};
