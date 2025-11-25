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

interface DownloadReadyEmailProps {
    customerName: string;
    orderId: string;
    productName: string;
    downloadUrl: string;
    expiresIn?: string;
}

export default function DownloadReadyEmail({
    customerName = 'Cliente',
    orderId = 'ABC123',
    productName = 'Seu Produto',
    downloadUrl = '#',
    expiresIn = '15 minutos',
}: DownloadReadyEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Seu download está pronto! 📥</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Logo */}
                    <Section style={logoSection}>
                        <Img
                            src="https://res.cloudinary.com/dr2fs6urk/image/upload/v1762458859/a-rafa-criou/brand/logo.png"
                            width="120"
                            height="auto"
                            alt="A Rafa Criou"
                            style={logo}
                        />
                    </Section>

                    {/* Header */}
                    <Heading style={h1}>Seu Download está Pronto! 📥</Heading>

                    <Text style={text}>Olá, {customerName}!</Text>

                    <Text style={text}>
                        Ótimas notícias! O pagamento do seu pedido <strong>#{orderId}</strong> foi confirmado e
                        seu PDF já está disponível para download.
                    </Text>

                    {/* Product Info */}
                    <Section style={productSection}>
                        <Text style={productNameStyle}>{productName}</Text>
                    </Section>

                    {/* CTA Button */}
                    <Section style={buttonSection}>
                        <Button href={downloadUrl} style={button}>
                            Baixar Agora
                        </Button>
                    </Section>

                    {/* Expiration Warning */}
                    <Section style={warningSection}>
                        <Text style={warningText}>
                            ⏰ <strong>Atenção:</strong> Este link expira em {expiresIn}. Você pode gerar um
                            novo link a qualquer momento acessando sua conta.
                        </Text>
                    </Section>

                    {/* Instructions */}
                    <Section style={instructionsSection}>
                        <Heading as="h2" style={h2}>
                            Como acessar seus downloads:
                        </Heading>
                        <Text style={instructionText}>
                            1. Acesse <Link href={`${process.env.NEXT_PUBLIC_BASE_URL}/conta`}>Minha Conta</Link>
                        </Text>
                        <Text style={instructionText}>2. Clique em &quot;Meus Downloads&quot;</Text>
                        <Text style={instructionText}>3. Baixe seus PDFs a qualquer momento</Text>
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
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 12px',
};

const text = {
    color: '#171717',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '16px 20px',
};

const productSection = {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px',
    textAlign: 'center' as const,
};

const productNameStyle = {
    color: '#171717',
    fontSize: '20px',
    fontWeight: '600',
    margin: '0',
};

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 20px',
};

const button = {
    backgroundColor: '#10b981',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '16px 48px',
};

const warningSection = {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '16px',
    margin: '20px',
};

const warningText = {
    color: '#78350f',
    fontSize: '14px',
    margin: '0',
    lineHeight: '20px',
};

const instructionsSection = {
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px',
};

const instructionText = {
    color: '#171717',
    fontSize: '14px',
    margin: '8px 0',
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
