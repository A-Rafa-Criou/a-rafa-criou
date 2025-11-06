import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Row,
    Column,
} from '@react-email/components';
import * as React from 'react';

interface PurchaseConfirmationEmailProps {
    customerName: string;
    orderId: string;
    orderDate: string;
    products: Array<{
        name: string;
        variationName?: string;
        price: number;
        downloadUrl: string;
        downloadUrls?: Array<{ name: string; url: string }>; // Múltiplos arquivos
        fileCount?: number; // 🆕 Quantidade de PDFs
    }>;
    totalAmount: number;
}

export const PurchaseConfirmationEmail = ({
    customerName = 'Cliente',
    orderId = '123e4567-e89b',
    orderDate = '07/10/2025',
    products = [
        {
            name: 'Produto Exemplo',
            variationName: 'Variação A',
            price: 29.90,
            downloadUrl: 'https://example.com/download',
        },
    ],
    totalAmount = 29.90,
}: PurchaseConfirmationEmailProps) => {
    const previewText = `Seu pedido #${orderId.slice(0, 8)} foi confirmado!`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <div style={innerWrapper}>
                        {/* Logo */}
                        <Section style={logoSection}>
                            <Img
                                src="https://res.cloudinary.com/dr2fs6urk/image/upload/v1762458859/a-rafa-criou/brand/logo.png"
                                width="250"
                                height="94"
                                alt="A Rafa Criou"
                                style={logo}
                            />
                        </Section>

                        {/* Título */}
                        <Heading style={h1}>✅ Compra Confirmada!</Heading>

                        <Text style={text}>Olá, {customerName}!</Text>

                        <Text style={text}>
                            Sua compra foi confirmada com sucesso. Seus PDFs já estão
                            disponíveis para download!
                        </Text>

                        {/* Informações do Pedido */}
                        <Section style={infoSection}>
                            <Row>
                                <Column>
                                    <Text style={label}>Pedido:</Text>
                                    <Text style={value}>#{orderId.slice(0, 13)}...</Text>
                                </Column>
                                <Column>
                                    <Text style={label}>Data:</Text>
                                    <Text style={value}>{orderDate}</Text>
                                </Column>
                            </Row>
                        </Section>

                        <Hr style={hr} />

                        {/* Lista de Produtos */}
                        <Section>
                            <Heading style={h2}>📦 Seus Produtos</Heading>

                            {products.map((product, index) => (
                                <Section key={index} style={productSection}>
                                    <Text style={productName}>
                                        {product.name}
                                        {product.variationName && (
                                            <span style={variationText}> - {product.variationName}</span>
                                        )}
                                        {product.fileCount && product.fileCount > 1 && (
                                            <span style={fileCountBadge}> • {product.fileCount} PDFs</span>
                                        )}
                                    </Text>
                                    <Text style={productPrice}>
                                        R$ {product.price.toFixed(2).replace('.', ',')}
                                    </Text>

                                    {/* Se tiver múltiplos arquivos (>1), mostrar botão ZIP */}
                                    {product.fileCount && product.fileCount > 1 ? (
                                        <>
                                            <Button style={downloadButton} href={product.downloadUrl}>
                                                📦 Baixar ZIP ({product.fileCount} arquivos)
                                            </Button>
                                            <Text style={zipNote}>
                                                ✨ Todos os {product.fileCount} PDFs em um arquivo compactado
                                            </Text>
                                        </>
                                    ) : product.downloadUrls && product.downloadUrls.length > 0 ? (
                                        // 1 arquivo - mostrar botão individual
                                        product.downloadUrls.map((file, fileIndex) => (
                                            <Button
                                                key={fileIndex}
                                                style={downloadButton}
                                                href={file.url}
                                            >
                                                📥 Baixar: {file.name}
                                            </Button>
                                        ))
                                    ) : (
                                        // Fallback para compatibilidade
                                        <Button style={downloadButton} href={product.downloadUrl}>
                                            📥 Baixar PDF
                                        </Button>
                                    )}

                                    {index < products.length - 1 && <Hr style={productHr} />}
                                </Section>
                            ))}
                        </Section>

                        <Hr style={hr} />

                        {/* Total */}
                        <Section style={totalSection}>
                            <Row>
                                <Column style={{ width: '70%' }}>
                                    <Text style={totalLabel}>Total Pago:</Text>
                                </Column>
                                <Column style={{ width: '30%', textAlign: 'right' }}>
                                    <Text style={totalValue}>
                                        R$ {totalAmount.toFixed(2).replace('.', ',')}
                                    </Text>
                                </Column>
                            </Row>
                        </Section>

                        <Hr style={hr} />

                        {/* Instruções */}
                        <Section style={instructionsSection}>
                            <Heading style={h3}>⚠️ Informações Importantes</Heading>
                            <Text style={instructionText}>
                                • Você tem <strong>30 dias de acesso</strong> para baixar seus arquivos
                            </Text>
                            <Text style={instructionText}>
                                • <strong>Recomendamos:</strong> Faça o download imediatamente e salve em
                                local seguro (Google Drive, OneDrive, backup local)
                            </Text>
                            <Text style={instructionText}>
                                • <strong>Direitos Autorais:</strong> Os materiais são para uso pessoal.
                                É proibida a revenda, distribuição ou compartilhamento não autorizado
                            </Text>
                            <Text style={instructionText}>
                                • Precisa baixar novamente?{' '}
                                <Link href="https://a-rafa-criou.com/conta/pedidos" style={link}>
                                    Acesse sua conta
                                </Link>
                            </Text>
                        </Section>

                        <Hr style={hr} />

                        {/* Botão Minha Conta */}
                        <Section style={ctaSection}>
                            <Button style={ctaButton} href="https://a-rafa-criou.com/conta/pedidos">
                                Ver Meus Pedidos
                            </Button>
                        </Section>

                        {/* Footer */}
                        <Section style={footer}>
                            <Text style={footerText}>
                                Dúvidas? Entre em contato:{' '}
                                <Link href="mailto:arafacriou@gmail.com" style={link}>
                                    arafacriou@gmail.com
                                </Link>
                            </Text>
                            <Text style={footerText}>
                                © {new Date().getFullYear()} A Rafa Criou - Todos os direitos
                                reservados
                            </Text>
                        </Section>
                    </div>
                </Container>
            </Body>
        </Html>
    );
};

export default PurchaseConfirmationEmail;

// Estilos
const main = {
    backgroundColor: '#F4F4F4',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    width: '100%',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '0',
    marginBottom: '64px',
    maxWidth: '600px',
    width: '100%',
};

const innerWrapper = {
    padding: '20px 0 48px',
    width: '100%',
    boxSizing: 'border-box' as const,
};

const logoSection = {
    padding: '32px 20px',
    textAlign: 'center' as const,
    backgroundColor: '#FED466',
};

const logo = {
    margin: '0 auto',
    display: 'block',
};

const h1 = {
    color: '#333',
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '30px 20px',
    padding: '0',
    textAlign: 'center' as const,
};

const h2 = {
    color: '#333',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '20px 20px 10px',
};

const h3 = {
    color: '#333',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 10px',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '16px 20px',
    padding: '0',
};

const infoSection = {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    margin: '20px',
    boxSizing: 'border-box' as const,
};

const label = {
    fontSize: '12px',
    color: '#666',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
};

const value = {
    fontSize: '16px',
    color: '#333',
    fontWeight: '600',
    margin: '0',
    wordWrap: 'break-word' as const,
};

const hr = {
    borderColor: '#e6e6e6',
    margin: '26px 20px',
};

const productSection = {
    padding: '16px 20px',
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
};

const productName = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 4px',
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
};

const variationText = {
    fontSize: '14px',
    fontWeight: '400',
    color: '#666',
    wordWrap: 'break-word' as const,
};

const fileCountBadge = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#FD9555',
    backgroundColor: '#FFF4E6',
    padding: '2px 8px',
    borderRadius: '4px',
    marginLeft: '8px',
    display: 'inline-block',
    whiteSpace: 'nowrap' as const,
};

const productPrice = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FD9555',
    margin: '4px 0 12px',
};

const zipNote = {
    fontSize: '13px',
    color: '#666',
    margin: '4px 0 8px',
    fontStyle: 'italic' as const,
    wordWrap: 'break-word' as const,
};

const downloadButton = {
    backgroundColor: '#FED466',
    borderRadius: '6px',
    color: '#333',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    width: '100%',
    maxWidth: '100%',
    padding: '12px 24px',
    margin: '8px 0',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
    wordWrap: 'break-word' as const,
};

const productHr = {
    borderColor: '#f0f0f0',
    margin: '16px 0',
};

const totalSection = {
    padding: '16px 20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    margin: '20px',
    wordWrap: 'break-word' as const,
    boxSizing: 'border-box' as const,
};

const totalLabel = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0',
};

const totalValue = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FD9555',
    margin: '0',
    wordWrap: 'break-word' as const,
};

const instructionsSection = {
    padding: '20px',
    backgroundColor: '#fff9e6',
    borderRadius: '8px',
    margin: '20px',
    border: '1px solid #FED466',
    boxSizing: 'border-box' as const,
};

const instructionText = {
    fontSize: '14px',
    color: '#666',
    lineHeight: '24px',
    margin: '4px 0',
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
};

const link = {
    color: '#FD9555',
    textDecoration: 'underline',
};

const ctaSection = {
    textAlign: 'center' as const,
    margin: '32px 20px',
};

const ctaButton = {
    backgroundColor: '#FD9555',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 32px',
    cursor: 'pointer',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
};

const footer = {
    textAlign: 'center' as const,
    margin: '32px 20px 0',
};

const footerText = {
    color: '#999',
    fontSize: '12px',
    lineHeight: '20px',
    margin: '4px 0',
    wordWrap: 'break-word' as const,
};
