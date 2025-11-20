/**
 * Integração com Twilio ou Zenvia para envio de SMS
 */

export interface SMSPayload {
  to: string; // Número no formato internacional: +5511999999999
  message: string;
}

/**
 * Envia SMS via Twilio
 */
export async function sendSMS(payload: SMSPayload): Promise<void> {
  // Verificar se credenciais estão configuradas
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('⚠️ Twilio não configurado - SMS não enviado');
    console.log('📝 Mensagem:', payload.message);
    return;
  }

  try {
    const auth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: payload.to,
          From: process.env.TWILIO_PHONE_NUMBER || '',
          Body: payload.message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro Twilio:', error);
      throw new Error(error.message || 'Erro ao enviar SMS');
    }

    const data = await response.json();
    console.log('✅ SMS enviado via Twilio:', data.sid);
  } catch (error) {
    console.error('❌ Erro ao enviar SMS:', error);
    throw error;
  }
}

/**
 * CONFIGURAÇÃO NECESSÁRIA:
 *
 * OPÇÃO 1 - TWILIO (Internacional):
 * 1. Criar conta: https://www.twilio.com/try-twilio
 * 2. Obter Account SID e Auth Token
 * 3. Comprar número de telefone
 * 4. Adicionar no .env:
 *
 * TWILIO_ACCOUNT_SID=seu_account_sid
 * TWILIO_AUTH_TOKEN=seu_auth_token
 * TWILIO_PHONE_NUMBER=+15551234567
 *
 * OPÇÃO 2 - ZENVIA (Brasil):
 * 1. Criar conta: https://www.zenvia.com/
 * 2. Obter API Token
 * 3. Implementar sendSMSZenvia() usando API deles
 *
 * Documentação Twilio: https://www.twilio.com/docs/sms
 * Documentação Zenvia: https://zenvia.github.io/zenvia-openapi-spec/
 */
