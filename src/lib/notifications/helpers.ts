import { NotificationService } from './notification-service';
import { render } from '@react-email/render';
import OrderConfirmationEmail from '@/emails/order-confirmation';
import DownloadReadyEmail from '@/emails/download-ready';
import PasswordResetEmail from '@/emails/password-reset';
import AdminSaleNotification from '@/emails/admin-sale-notification';
import { sendWebPushToAdmins, sendWebPushToUser } from './channels/web-push';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmailViaGmail } from './channels/email-gmail';

/**
 * Helpers para enviar notificações pré-configuradas
 */

/**
 * Envia email de confirmação de pedido
 */
export async function sendOrderConfirmation(data: {
  userId: string;
  customerName: string;
  customerEmail?: string;
  orderId: string;
  orderTotal: string;
  orderTotalBRL?: string;
  orderItems: Array<{
    name: string;
    variationName?: string;
    quantity: number;
    price: string;
  }>;
  orderUrl: string;
}) {
  console.log('='.repeat(80));
  console.log('🎯 [ORDER CONFIRMATION] Função iniciada para pedido:', data.orderId);
  console.log('👤 [ORDER CONFIRMATION] Cliente:', data.customerName, '|', data.customerEmail);
  console.log('💰 [ORDER CONFIRMATION] Total:', data.orderTotal);
  console.log('='.repeat(80));

  const emailHtml = await render(
    OrderConfirmationEmail({
      customerName: data.customerName,
      orderId: data.orderId,
      orderTotal: data.orderTotal,
      orderItems: data.orderItems,
      orderUrl: data.orderUrl,
    })
  );

  await NotificationService.send({
    userId: data.userId,
    type: 'order_confirmation',
    subject: `Pedido #${data.orderId} Confirmado!`,
    content: emailHtml,
    metadata: {
      orderId: data.orderId,
      orderTotal: data.orderTotal,
    },
  });

  // Notificar cliente via Web Push
  try {
    await sendWebPushToUser(data.userId, {
      title: '✅ Pedido Confirmado',
      body: `Pedido #${data.orderId} confirmado! Total: ${data.orderTotal}`,
      url: data.orderUrl,
      data: {
        type: 'order_confirmation',
        orderId: data.orderId,
      },
    });
  } catch (error) {
    console.error('Erro ao enviar Web Push:', error);
  }

  // Notificar ADMIN sobre nova venda (Web Push)
  try {
    console.log('🎯 [ADMIN WEB PUSH] Iniciando envio...');
    console.log(
      '🔑 [ADMIN WEB PUSH] ONESIGNAL_APP_ID:',
      process.env.ONESIGNAL_APP_ID ? '✅ OK' : '❌ FALTANDO'
    );
    console.log(
      '🔑 [ADMIN WEB PUSH] ONESIGNAL_REST_API_KEY:',
      process.env.ONESIGNAL_REST_API_KEY ? '✅ OK' : '❌ FALTANDO'
    );
    console.log('📤 [ADMIN WEB PUSH] Enviando Web Push para admins...');

    // Criar lista de produtos para a notificação
    const productsList = data.orderItems
      .map(item => {
        const variation = item.variationName ? ` (${item.variationName})` : '';
        return `${item.name}${variation}`;
      })
      .join(', ');

    // Limitar tamanho para caber na notificação
    const productsDisplay =
      productsList.length > 80 ? productsList.substring(0, 77) + '...' : productsList;

    await sendWebPushToAdmins({
      title: '💰 Nova Venda Confirmada!',
      body: `${data.customerName} comprou: ${productsDisplay}\nTotal: ${data.orderTotal}`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/pedidos/${data.orderId}`,
      data: {
        type: 'new_sale',
        orderId: data.orderId,
        customerName: data.customerName,
        orderTotal: data.orderTotal,
        products: data.orderItems.map(item => item.name),
        status: 'success',
      },
    });
    console.log('✅ [ADMIN WEB PUSH] Web Push enviado para admins com sucesso!');
  } catch (error) {
    console.error('❌ [ADMIN WEB PUSH] Erro ao notificar admins via Web Push:', error);
    console.error('❌ [ADMIN WEB PUSH] Stack trace:', error instanceof Error ? error.stack : 'N/A');
  }

  // Notificar ADMIN sobre nova venda (EMAIL)
  try {
    await sendAdminSaleNotification({
      customerName: data.customerName,
      customerEmail: data.customerEmail || 'N/A',
      orderId: data.orderId,
      orderTotal: data.orderTotal,
      orderTotalBRL: data.orderTotalBRL,
      orderItems: data.orderItems,
    });
  } catch (error) {
    console.error('Erro ao notificar admins via Email:', error);
  }
}

/**
 * Envia email de download pronto
 */
export async function sendDownloadReady(data: {
  userId: string;
  customerName: string;
  orderId: string;
  productName: string;
  downloadUrl: string;
  expiresIn?: string;
}) {
  const emailHtml = await render(
    DownloadReadyEmail({
      customerName: data.customerName,
      orderId: data.orderId,
      productName: data.productName,
      downloadUrl: data.downloadUrl,
      expiresIn: data.expiresIn,
    })
  );

  await NotificationService.send({
    userId: data.userId,
    type: 'download_ready',
    subject: `Seu download está pronto!`,
    content: emailHtml,
    metadata: {
      orderId: data.orderId,
      productName: data.productName,
    },
  });

  // Notificar cliente via Web Push
  try {
    await sendWebPushToUser(data.userId, {
      title: '⬇️ Download Pronto!',
      body: `${data.productName} está disponível para download`,
      url: data.downloadUrl,
      data: {
        type: 'download_ready',
        orderId: data.orderId,
        productName: data.productName,
      },
    });
  } catch (error) {
    console.error('Erro ao enviar Web Push:', error);
  }
}

/**
 * Envia email de redefinição de senha
 */
export async function sendPasswordReset(data: {
  userId: string;
  customerName: string;
  resetUrl: string;
  expiresIn?: string;
}) {
  const emailHtml = await render(
    PasswordResetEmail({
      customerName: data.customerName,
      resetUrl: data.resetUrl,
      expiresIn: data.expiresIn,
    })
  );

  await NotificationService.send({
    userId: data.userId,
    type: 'password_reset',
    subject: 'Redefinir Senha - A Rafa Criou',
    content: emailHtml,
    channels: ['email'], // Apenas email para segurança
  });
}

/**
 * Envia notificação de pagamento confirmado
 */
export async function sendPaymentConfirmed(data: {
  userId: string;
  customerName: string;
  orderId: string;
  orderTotal: string;
  paymentMethod: string;
}) {
  const content = `
    <h2>Pagamento Confirmado! ✅</h2>
    <p>Recebemos a confirmação do pagamento do seu pedido #${data.orderId}.</p>
    <p><strong>Valor:</strong> ${data.orderTotal}</p>
    <p><strong>Método:</strong> ${data.paymentMethod}</p>
    <p>Estamos preparando seus downloads. Você receberá um email assim que estiverem prontos.</p>
  `;

  await NotificationService.send({
    userId: data.userId,
    type: 'payment_confirmed',
    subject: `Pagamento Confirmado - Pedido #${data.orderId}`,
    content,
    metadata: {
      orderId: data.orderId,
      orderTotal: data.orderTotal,
      paymentMethod: data.paymentMethod,
    },
  });

  // Notificar cliente via Web Push
  try {
    await sendWebPushToUser(data.userId, {
      title: '💳 Pagamento Confirmado',
      body: `Pedido #${data.orderId} - ${data.orderTotal}`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/conta/pedidos/${data.orderId}`,
      data: {
        type: 'payment_confirmed',
        orderId: data.orderId,
      },
    });
  } catch (error) {
    console.error('Erro ao enviar Web Push:', error);
  }

  // Notificar ADMIN sobre pagamento recebido
  try {
    await sendWebPushToAdmins({
      title: '💳 Pagamento Recebido!',
      body: `${data.customerName} pagou ${data.orderTotal} via ${data.paymentMethod}\nPedido #${data.orderId.slice(0, 8)}`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/pedidos/${data.orderId}`,
      data: {
        type: 'payment_received',
        orderId: data.orderId,
        customerName: data.customerName,
        orderTotal: data.orderTotal,
        paymentMethod: data.paymentMethod,
        status: 'success',
      },
    });
  } catch (error) {
    console.error('Erro ao notificar admins:', error);
  }
}

/**
 * Envia notificação de pagamento falhado para ADMINS via Web Push
 */
export async function sendPaymentFailedNotification(data: {
  customerName?: string;
  customerEmail?: string;
  orderId: string;
  orderTotal?: string;
  paymentMethod?: string;
  errorReason?: string;
}) {
  try {
    const customerDisplay = data.customerName || data.customerEmail || 'Cliente';
    const totalDisplay = data.orderTotal || 'N/A';

    await sendWebPushToAdmins({
      title: '❌ Pagamento Falhou!',
      body: `${customerDisplay} - ${totalDisplay}\n${data.errorReason || 'Pagamento não aprovado'}`,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/pedidos/${data.orderId}`,
      data: {
        type: 'payment_failed',
        orderId: data.orderId,
        customerName: customerDisplay,
        orderTotal: totalDisplay,
        paymentMethod: data.paymentMethod,
        errorReason: data.errorReason,
        status: 'failed',
      },
    });
    console.log('✅ [ADMIN WEB PUSH] Notificação de pagamento falhado enviada');
  } catch (error) {
    console.error('❌ Erro ao notificar admins sobre pagamento falhado:', error);
  }
}

/**
 * Envia notificação promocional
 */
export async function sendPromotional(data: {
  userId: string;
  subject: string;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  await NotificationService.send({
    userId: data.userId,
    type: 'promotional',
    subject: data.subject,
    content: data.content,
    metadata: data.metadata,
  });
}

/**
 * Envia notificação de venda para TODOS os admins via EMAIL
 */
async function sendAdminSaleNotification(data: {
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
}) {
  // Buscar todos os usuários com role='admin'
  const adminUsers = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.role, 'admin'));

  if (adminUsers.length === 0) {
    console.warn('Nenhum admin encontrado para notificar sobre venda');
    return;
  }

  // Renderizar email
  const emailHtml = await render(
    AdminSaleNotification({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      orderId: data.orderId,
      orderTotal: data.orderTotal,
      orderTotalBRL: data.orderTotalBRL,
      orderItems: data.orderItems,
      orderDate: new Date().toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    })
  );

  // Enviar email para TODOS os admins via Gmail
  const emailPromises = adminUsers.map((admin: { email: string; name: string | null }) =>
    sendEmailViaGmail({
      to: admin.email,
      subject: `🛒 Nova Venda - ${data.customerName} - ${data.orderTotal}`,
      html: emailHtml,
      metadata: { tags: ['admin', 'venda', 'notificacao'] },
    }).catch((error: unknown) => {
      console.error(`Erro ao enviar email para admin ${admin.email}:`, error);
    })
  );

  await Promise.allSettled(emailPromises);
  console.log(`✅ Notificação de venda enviada para ${adminUsers.length} admin(s)`);
}
