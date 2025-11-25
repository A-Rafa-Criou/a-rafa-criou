import * as React from 'react';
import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Hr,
} from '@react-email/components';

interface AdminSaleNotificationProps {
    customerName: string;
    customerEmail: string;
    orderId: string;
    orderTotal: string;
    orderTotalBRL?: string;
    orderItems: Array<{
        name: string;
        variationName?: string;
        quantity: number;
        price: string;
    }>;
    orderDate: string;
}

export default function AdminSaleNotification({
    customerName,
    customerEmail,
    orderId,
    orderTotal,
    orderTotalBRL,
    orderItems,
    orderDate,
}: AdminSaleNotificationProps) {
    return (
        <Html>
            <Head />
            <Preview>Nova venda: {customerName} - {orderTotal}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header com Logo */}
                    <Section style={header}>
                        <Img
                            src="https://res.cloudinary.com/dr2fs6urk/image/upload/v1762458859/a-rafa-criou/brand/logo.png"
                            alt="A Rafa Criou"
                            width="120"
                            height="40"
                            style={logo}
                        />
                    </Section>

                    {/* Badge de Nova Venda */}
                    <Section style={badgeSection}>
                        <div style={badge}>
                            <Text style={badgeText}>🛒 NOVA VENDA</Text>
                        </div>
                    </Section>

                    <Heading style={h1}>Pedido #{orderId.slice(0, 8)}</Heading>

                    {/* Informações do Cliente */}
                    <Section style={customerSection}>
                        <Text style={sectionTitle}>👤 Informações do Cliente</Text>
                        <div style={infoCard}>
                            <div style={infoRow}>
                                <Text style={infoLabel}>Nome:</Text>
                                <Text style={infoValue}>{customerName}</Text>
                            </div>
                            <div style={infoRow}>
                                <Text style={infoLabel}>Email:</Text>
                                <Text style={infoValue}>{customerEmail}</Text>
                            </div>
                            <div style={infoRow}>
                                <Text style={infoLabel}>Data:</Text>
                                <Text style={infoValue}>{orderDate}</Text>
                            </div>
                        </div>
                    </Section>

                    <Hr style={divider} />

                    {/* Itens do Pedido */}
                    <Section style={itemsSection}>
                        <Text style={sectionTitle}>📦 Itens do Pedido</Text>
                        <div style={itemsCard}>
                            {orderItems.map((item, index) => (
                                <div key={index} style={itemRowStyle}>
                                    <div style={itemDetails}>
                                        <Text style={itemQuantity}>{item.quantity}x</Text>
                                        <Text style={itemName}>
                                            {item.name}
                                            {item.variationName && (
                                                <span style={variationText}> - {item.variationName}</span>
                                            )}
                                        </Text>
                                    </div>
                                    <Text style={itemPrice}>{item.price}</Text>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Hr style={divider} />

                    {/* Total */}
                    <Section style={totalSection}>
                        <div style={totalRow}>
                            <Text style={totalLabel}>TOTAL DO PEDIDO</Text>
                            <Text style={totalValue}>{orderTotal}</Text>
                        </div>
                        {orderTotalBRL && orderTotalBRL !== orderTotal && (
                            <div style={totalRow}>
                                <Text style={totalLabelBRL}>Equivalente em BRL:</Text>
                                <Text style={totalValueBRL}>{orderTotalBRL}</Text>
                            </div>
                        )}
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            🔔 Acesse o painel administrativo para mais detalhes
                        </Text>
                        <Text style={footerSubtext}>
                            A Rafa Criou - Lembrancinhas e Materiais Digitais
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#F4F4F4', // Cor de fundo do projeto
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    padding: '20px 0',
    WebkitTextSizeAdjust: '100%',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '0',
    marginBottom: '32px',
    maxWidth: '600px',
    width: '100%',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
};

const header = {
    backgroundColor: '#FED466', // Cor primária do projeto
    padding: '20px',
    textAlign: 'center' as const,
};

const logo = {
    margin: '0 auto',
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
};

const badgeSection = {
    padding: '20px 20px 0',
    textAlign: 'center' as const,
};

const badge = {
    display: 'inline-block',
    backgroundColor: '#FD9555', // Cor secundária do projeto
    borderRadius: '20px',
    padding: '8px 16px',
};

const badgeText = {
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 'bold',
    margin: '0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
};

const h1 = {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '16px 0 24px',
    padding: '0 20px',
    textAlign: 'center' as const,
    lineHeight: '1.4',
};

const customerSection = {
    padding: '0 20px',
    marginBottom: '20px',
};

const sectionTitle = {
    color: '#1f2937',
    fontSize: '15px',
    fontWeight: 'bold',
    margin: '0 0 12px',
};

const infoCard = {
    backgroundColor: '#F4F4F4',
    borderRadius: '8px',
    padding: '12px',
};

const infoRow = {
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
};

const infoLabel = {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    display: 'block',
};

const infoValue = {
    color: '#1f2937',
    fontSize: '14px',
    margin: '0',
    wordBreak: 'break-word' as const,
    display: 'block',
};

const divider = {
    borderColor: '#e5e7eb',
    margin: '20px',
};

const itemsSection = {
    padding: '0 20px',
    marginBottom: '20px',
};

const itemsCard = {
    backgroundColor: '#F4F4F4',
    borderRadius: '8px',
    padding: '12px',
};

const itemRowStyle = {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
};

const itemDetails = {
    marginBottom: '4px',
};

const itemQuantity = {
    color: '#FD9555', // Cor secundária
    fontSize: '13px',
    fontWeight: 'bold',
    margin: '0',
    display: 'inline-block',
    minWidth: '25px',
};

const itemName = {
    color: '#1f2937',
    fontSize: '13px',
    margin: '0',
    display: 'inline-block',
    wordBreak: 'break-word' as const,
    lineHeight: '1.5',
};

const itemPrice = {
    color: '#1f2937',
    fontSize: '14px',
    fontWeight: '600',
    margin: '4px 0 0 0',
    textAlign: 'right' as const,
    display: 'block',
};

const totalSection = {
    padding: '0 20px 20px',
};

const totalRow = {
    backgroundColor: '#FED466', // Cor primária
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
};

const totalLabel = {
    color: '#1f2937',
    fontSize: '12px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    letterSpacing: '0.5px',
    display: 'block',
};

const totalValue = {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
    display: 'block',
};

const totalLabelBRL = {
    color: '#6b7280',
    fontSize: '11px',
    fontWeight: '500',
    margin: '12px 0 4px 0',
    display: 'block',
};

const totalValueBRL = {
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
    display: 'block',
};

const footer = {
    backgroundColor: '#f9fafb',
    padding: '20px',
    textAlign: 'center' as const,
    borderTop: '1px solid #e5e7eb',
};

const footerText = {
    color: '#6b7280',
    fontSize: '13px',
    margin: '0 0 8px',
    lineHeight: '1.5',
};

const footerSubtext = {
    color: '#9ca3af',
    fontSize: '11px',
    margin: '0',
};

const variationText = {
    color: '#6b7280',
    fontSize: '12px',
    fontStyle: 'italic' as const,
};
