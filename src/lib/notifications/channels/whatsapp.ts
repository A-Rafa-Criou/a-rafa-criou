/**
 * Integração com API do WhatsApp (Meta Business API)
 * Requer configuração de WhatsApp Business Account
 */

export interface WhatsAppPayload {
  to: string; // Número no formato internacional: +5511999999999
  message: string;
  mediaUrl?: string;
}

/**
 * Envia mensagem via WhatsApp Business API
 */
export async function sendWhatsApp(payload: WhatsAppPayload): Promise<void> {
  // Verificar se credenciais estão configuradas
  if (!process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('⚠️ WhatsApp API não configurada - mensagem não enviada');
    console.log('📝 Mensagem:', payload.message);
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: payload.to.replace(/\D/g, ''), // Remove caracteres não numéricos
          type: 'text',
          text: {
            body: payload.message,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro WhatsApp API:', error);
      throw new Error(error.error?.message || 'Erro ao enviar WhatsApp');
    }

    const data = await response.json();
    console.log('✅ WhatsApp enviado:', data.messages?.[0]?.id);
  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error);
    throw error;
  }
}

/**
 * CONFIGURAÇÃO NECESSÁRIA:
 *
 * 1. Criar conta Meta Business: https://business.facebook.com
 * 2. Adicionar WhatsApp Business API
 * 3. Obter Phone Number ID e Access Token
 * 4. Adicionar no .env:
 *
 * WHATSAPP_API_TOKEN=seu_token_aqui
 * WHATSAPP_PHONE_NUMBER_ID=seu_phone_id_aqui
 *
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
