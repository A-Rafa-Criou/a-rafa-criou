import { db } from '@/lib/db';
import { notifications, notificationSettings, users } from '@/lib/db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import { sendEmail } from './channels/email';
import { sendSMS } from './channels/sms';
import { sendWhatsApp } from './channels/whatsapp';
// sendWebPush agora usado via helpers.ts (sendWebPushToUser/sendWebPushToAdmins)

export type NotificationType =
  | 'order_confirmation'
  | 'download_ready'
  | 'password_reset'
  | 'promotional'
  | 'order_status'
  | 'payment_confirmed';

export type NotificationChannel = 'email' | 'whatsapp' | 'sms' | 'web_push';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  subject?: string;
  content: string;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[]; // Se não especificado, usa preferências do usuário
}

interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  error?: string;
}

/**
 * Serviço central de notificações
 * Gerencia envio multi-canal respeitando preferências do usuário
 */
export class NotificationService {
  /**
   * Envia notificação para usuário respeitando suas preferências
   */
  static async send(payload: NotificationPayload): Promise<NotificationResult[]> {
    try {
      // 1. Buscar usuário e suas preferências
      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);

      if (!user) {
        console.error('❌ Usuário não encontrado:', payload.userId);
        return [];
      }

      const [settings] = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, payload.userId))
        .limit(1);

      // 2. Criar configurações padrão se não existir
      if (!settings) {
        await this.createDefaultSettings(payload.userId);
      }

      // 3. Determinar canais a serem usados
      const channels = payload.channels || this.getEnabledChannels(payload.type, settings);

      // 4. Verificar DND (Do Not Disturb)
      if (settings?.dndEnabled && this.isInDND(settings)) {
        console.log('🔇 DND ativo para usuário:', payload.userId);
        // Apenas notificações de segurança passam no DND
        if (payload.type !== 'password_reset') {
          return [];
        }
      }

      // 5. Enviar para cada canal
      const results: NotificationResult[] = [];

      for (const channel of channels) {
        const result = await this.sendToChannel({
          ...payload,
          channel,
          userEmail: user.email,
          userName: user.name || 'Cliente',
          whatsappNumber: settings?.whatsappNumber,
          smsNumber: settings?.smsNumber,
          webPushSubscription: settings?.webPushSubscription,
        });

        results.push(result);

        // 6. Registrar no banco
        await this.logNotification({
          userId: payload.userId,
          type: payload.type,
          channel,
          status: result.success ? 'sent' : 'failed',
          subject: payload.subject,
          content: payload.content,
          metadata: payload.metadata,
          failedReason: result.error,
        });
      }

      return results;
    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
      return [];
    }
  }

  /**
   * Envia para um canal específico
   */
  private static async sendToChannel(
    data: NotificationPayload & {
      channel: NotificationChannel;
      userEmail: string;
      userName: string;
      whatsappNumber?: string | null;
      smsNumber?: string | null;
      webPushSubscription?: string | null;
    }
  ): Promise<NotificationResult> {
    try {
      switch (data.channel) {
        case 'email':
          await sendEmail({
            to: data.userEmail,
            subject: data.subject || this.getDefaultSubject(data.type),
            html: data.content,
            metadata: data.metadata,
          });
          return { success: true, channel: 'email' };

        case 'sms':
          if (!data.smsNumber) {
            return { success: false, channel: 'sms', error: 'Número de SMS não configurado' };
          }
          await sendSMS({
            to: data.smsNumber,
            message: this.stripHtml(data.content),
          });
          return { success: true, channel: 'sms' };

        case 'whatsapp':
          if (!data.whatsappNumber) {
            return {
              success: false,
              channel: 'whatsapp',
              error: 'Número de WhatsApp não configurado',
            };
          }
          await sendWhatsApp({
            to: data.whatsappNumber,
            message: this.stripHtml(data.content),
          });
          return { success: true, channel: 'whatsapp' };

        case 'web_push':
          // Web Push agora usa sendWebPushToUser() e sendWebPushToAdmins()
          // Chamados diretamente nos helpers para controle granular
          return {
            success: false,
            channel: 'web_push',
            error: 'Web Push deve ser enviado via helpers.ts',
          };

        default:
          return { success: false, channel: data.channel, error: 'Canal não suportado' };
      }
    } catch (error) {
      console.error(`❌ Erro ao enviar ${data.channel}:`, error);
      return {
        success: false,
        channel: data.channel,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Obtém canais habilitados para um tipo de notificação
   */
  private static getEnabledChannels(
    type: NotificationType,
    settings: typeof notificationSettings.$inferSelect | undefined | null
  ): NotificationChannel[] {
    if (!settings) {
      // Padrão: apenas email
      return ['email'];
    }

    const channels: NotificationChannel[] = [];

    switch (type) {
      case 'order_confirmation':
        if (settings.orderConfirmationEmail) channels.push('email');
        if (settings.orderConfirmationSms) channels.push('sms');
        if (settings.orderConfirmationWhatsapp) channels.push('whatsapp');
        break;

      case 'download_ready':
        if (settings.downloadReadyEmail) channels.push('email');
        if (settings.downloadReadySms) channels.push('sms');
        if (settings.downloadReadyWhatsapp) channels.push('whatsapp');
        break;

      case 'promotional':
        if (settings.promotionalEmail) channels.push('email');
        if (settings.promotionalSms) channels.push('sms');
        if (settings.promotionalWhatsapp) channels.push('whatsapp');
        break;

      case 'password_reset':
      case 'order_status':
      case 'payment_confirmed':
        // Sempre email para segurança
        if (settings.securityEmail) channels.push('email');
        break;
    }

    return channels.length > 0 ? channels : ['email'];
  }

  /**
   * Verifica se está no horário de DND
   */
  private static isInDND(settings: typeof notificationSettings.$inferSelect): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    const start = settings.dndStartHour || 22;
    const end = settings.dndEndHour || 8;

    // DND atravessa meia-noite
    if (start > end) {
      return currentHour >= start || currentHour < end;
    }

    return currentHour >= start && currentHour < end;
  }

  /**
   * Cria configurações padrão para usuário
   */
  private static async createDefaultSettings(userId: string): Promise<void> {
    await db.insert(notificationSettings).values({
      userId,
      orderConfirmationEmail: true,
      orderConfirmationSms: false,
      orderConfirmationWhatsapp: false,
      downloadReadyEmail: true,
      downloadReadySms: false,
      downloadReadyWhatsapp: false,
      promotionalEmail: true,
      promotionalSms: false,
      promotionalWhatsapp: false,
      securityEmail: true,
      dndEnabled: false,
      dndStartHour: 22,
      dndEndHour: 8,
    });
  }

  /**
   * Registra notificação no banco
   */
  private static async logNotification(data: {
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    status: 'pending' | 'sent' | 'failed';
    subject?: string;
    content: string;
    metadata?: Record<string, unknown>;
    failedReason?: string;
  }): Promise<void> {
    await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      channel: data.channel,
      status: data.status,
      subject: data.subject,
      content: data.content,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      sentAt: data.status === 'sent' ? new Date() : null,
      failedReason: data.failedReason,
    });
  }

  /**
   * Remove HTML de string
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Assunto padrão por tipo
   */
  private static getDefaultSubject(type: NotificationType): string {
    const subjects: Record<NotificationType, string> = {
      order_confirmation: 'Pedido Confirmado - A Rafa Criou',
      download_ready: 'Seu Download está Pronto - A Rafa Criou',
      password_reset: 'Redefinir Senha - A Rafa Criou',
      promotional: 'Novidades - A Rafa Criou',
      order_status: 'Atualização do Pedido - A Rafa Criou',
      payment_confirmed: 'Pagamento Confirmado - A Rafa Criou',
    };

    return subjects[type] || 'Notificação - A Rafa Criou';
  }

  /**
   * Retentar notificações falhas
   */
  static async retryFailed(maxRetries = 3): Promise<number> {
    const failed = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.status, 'failed'),
          lt(notifications.retryCount, maxRetries),
          gte(notifications.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // últimas 24h
        )
      );

    let retried = 0;

    for (const notification of failed) {
      try {
        const metadata = notification.metadata ? JSON.parse(notification.metadata) : {};

        await this.send({
          userId: notification.userId,
          type: notification.type as NotificationType,
          subject: notification.subject || undefined,
          content: notification.content,
          metadata,
          channels: [notification.channel as NotificationChannel],
        });

        // Atualizar contador de retry
        await db
          .update(notifications)
          .set({ retryCount: (notification.retryCount || 0) + 1 })
          .where(eq(notifications.id, notification.id));

        retried++;
      } catch (error) {
        console.error('❌ Erro ao retentar notificação:', error);
      }
    }

    return retried;
  }
}
