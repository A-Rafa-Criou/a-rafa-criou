/* eslint-disable @next/next/no-img-element */
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
    currency?: string; // 🆕 Moeda do pedido
    accessDays?: number; // 🆕 Dias de acesso
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
    currency = 'BRL',
    accessDays = 30,
}: PurchaseConfirmationEmailProps) => {
    const previewText = `Seu pedido #${orderId.slice(0, 8)} foi confirmado!`;

    // Função para formatar preço com símbolo correto
    const formatPrice = (price: number, curr: string = currency) => {
        const symbols: Record<string, string> = {
            BRL: 'R$',
            USD: '$',
            EUR: '€',
            MXN: 'MEX$',
        };
        const symbol = symbols[curr.toUpperCase()] || 'R$';

        if (curr.toUpperCase() === 'BRL') {
            return `${symbol} ${price.toFixed(2).replace('.', ',')}`;
        }
        if (curr.toUpperCase() === 'MXN') {
            return `${symbol} ${price.toFixed(2)}`;
        }
        return `${symbol}${price.toFixed(2)}`;
    };

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
                        <Heading style={h1}>✅ Compra Confirmada</Heading>

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
                                        {formatPrice(product.price)}
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
                            <Text style={totalLabel}>Total Pago:</Text>
                            <Text style={totalValue}>
                                {formatPrice(totalAmount)}
                            </Text>
                        </Section>

                        <Hr style={hr} />

                        {/* Instruções */}
                        <Section style={instructionsSection}>
                            <Heading style={h3}>⚠️ Informações Importantes</Heading>
                            <Text style={instructionText}>
                                • Você tem <strong>{accessDays} {accessDays === 1 ? 'dia' : 'dias'} de acesso</strong> para baixar seus arquivos
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
                                <Link href="https://arafacriou.com.br/conta/pedidos" style={link}>
                                    Acesse sua conta
                                </Link>
                            </Text>
                        </Section>

                        <Hr style={hr} />

                        {/* Botão Minha Conta */}
                        <Section style={ctaSection}>
                            <Button style={ctaButton} href="https://arafacriou.com.br/conta/pedidos">
                                Ver Meus Pedidos
                            </Button>
                        </Section>

                        {/* Footer */}
                        <Section style={footer}>
                            <Text style={footerText}>
                                Dúvidas? Entre em contato:{' '}
                                <Link href="mailto:contato@arafacriou.com.br" style={link}>
                                    contato@arafacriou.com.br
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
    padding: '20px 10px 48px',
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
    fontSize: '26px',
    fontWeight: 'bold',
    margin: '30px 10px 20px',
    padding: '0',
    textAlign: 'center' as const,
    lineHeight: '1.2',
};

const h2 = {
    color: '#333',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '20px 10px 10px',
    maxWidth: '100%',
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
    margin: '16px 10px',
    maxWidth: '100%',
    padding: '0',
};

const infoSection = {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    margin: '20px 10px',
    width: 'calc(100% - 20px)',
    maxWidth: '560px',
    marginLeft: 'auto',
    marginRight: 'auto',
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
    fontSize: '15px',
    color: '#333',
    fontWeight: '600',
    margin: '0',
    wordWrap: 'break-word' as const,
    lineHeight: '1.3',
};

const hr = {
    borderColor: '#e6e6e6',
    margin: '26px 10px',
    width: 'calc(100% - 20px)',
    maxWidth: '520px',
    marginLeft: 'auto',
    marginRight: 'auto',
};

const productSection = {
    padding: '16px 10px',
    margin: '0 auto',
    width: '100%',
    maxWidth: '540px',
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
    margin: '4px 10px 8px',
    width: 'calc(100% - 20px)',
    maxWidth: '520px',
    marginLeft: 'auto',
    marginRight: 'auto',
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
    wordWrap: 'break-word' as const,
};

const downloadButton = {
    backgroundColor: '#FED466',
    borderRadius: '8px',
    color: '#333',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    width: 'calc(100% - 20px)',
    maxWidth: '520px',
    padding: '14px 24px',
    margin: '8px auto',
    marginLeft: 'auto',
    marginRight: 'auto',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
    wordWrap: 'break-word' as const,
    border: '2px solid #FED466',
    transition: 'all 0.2s ease',
};

const productHr = {
    borderColor: '#f0f0f0',
    margin: '16px 10px',
    width: 'calc(100% - 20px)',
    maxWidth: '520px',
    marginLeft: 'auto',
    marginRight: 'auto',
};

const totalSection = {
    padding: '24px 20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    margin: '20px 10px',
    width: 'calc(100% - 20px)',
    maxWidth: '560px',
    marginLeft: 'auto',
    marginRight: 'auto',
    wordWrap: 'break-word' as const,
    boxSizing: 'border-box' as const,
};

const totalLabel = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#666',
    margin: '0 0 8px 0',
    textAlign: 'center' as const,
};

const totalValue = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#FD9555',
    margin: '0',
    textAlign: 'center' as const,
    wordWrap: 'break-word' as const,
};

const instructionsSection = {
    padding: '20px',
    backgroundColor: '#fff9e6',
    borderRadius: '8px',
    margin: '20px 10px',
    width: 'calc(100% - 20px)',
    maxWidth: '520px',
    marginLeft: 'auto',
    marginRight: 'auto',
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
    margin: '32px 10px',
    width: 'calc(100% - 20px)',
    maxWidth: '520px',
    marginLeft: 'auto',
    marginRight: 'auto',
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
    width: 'calc(100% - 20px)',
    maxWidth: '280px',
    margin: '0 10px',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxSizing: 'border-box' as const,
};

const footer = {
    textAlign: 'center' as const,
    margin: '32px 10px 0',
    width: 'calc(100% - 20px)',
    maxWidth: '520px',
    marginLeft: 'auto',
    marginRight: 'auto',
};

const footerText = {
    color: '#999',
    fontSize: '12px',
    lineHeight: '20px',
    margin: '4px 0',
    wordWrap: 'break-word' as const,
};
