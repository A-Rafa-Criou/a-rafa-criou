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

interface PasswordResetEmailProps {
    customerName: string;
    resetUrl: string;
    expiresIn?: string;
}

export default function PasswordResetEmail({
    customerName = 'Cliente',
    resetUrl = '#',
    expiresIn = '1 hora',
}: PasswordResetEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Redefinir sua senha - A Rafa Criou</Preview>
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
                    <Heading style={h1}>Redefinir Senha 🔑</Heading>

                    <Text style={text}>Olá, {customerName}!</Text>

                    <Text style={text}>
                        Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo
                        para criar uma nova senha:
                    </Text>

                    {/* CTA Button */}
                    <Section style={buttonSection}>
                        <Button href={resetUrl} style={button}>
                            Redefinir Senha
                        </Button>
                    </Section>

                    {/* Expiration Warning */}
                    <Section style={warningSection}>
                        <Text style={warningText}>
                            ⏰ Este link expira em {expiresIn} por motivos de segurança.
                        </Text>
                    </Section>

                    {/* Security Note */}
                    <Section style={securitySection}>
                        <Heading as="h2" style={h2}>
                            🔐 Dica de Segurança
                        </Heading>
                        <Text style={securityText}>
                            Se você não solicitou esta redefinição de senha, ignore este email. Sua senha
                            permanecerá inalterada.
                        </Text>
                        <Text style={securityText}>
                            Nunca compartilhe suas senhas e certifique-se de usar senhas fortes e únicas para
                            cada serviço.
                        </Text>
                    </Section>

                    {/* Alternative Link */}
                    <Section style={alternativeSection}>
                        <Text style={alternativeText}>
                            Problemas com o botão? Copie e cole este link no seu navegador:
                        </Text>
                        <Link href={resetUrl} style={alternativeLink}>
                            {resetUrl}
                        </Link>
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

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 20px',
};

const button = {
    backgroundColor: '#ef4444',
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
    textAlign: 'center' as const,
};

const securitySection = {
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px',
};

const securityText = {
    color: '#171717',
    fontSize: '14px',
    margin: '8px 0',
    lineHeight: '20px',
};

const alternativeSection = {
    padding: '20px',
    margin: '20px 0',
};

const alternativeText = {
    color: '#6b7280',
    fontSize: '12px',
    margin: '0 0 8px',
    textAlign: 'center' as const,
};

const alternativeLink = {
    color: '#fd9555',
    fontSize: '12px',
    wordBreak: 'break-all' as const,
    display: 'block',
    textAlign: 'center' as const,
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
