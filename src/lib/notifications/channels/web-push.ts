/**
 * OneSignal Web Push - Integração Completa
 *
 * Notificações para:
 * - ADMIN: Vendas, novos pedidos, pagamentos (filtradas por tag role:admin)
 * - CLIENTES: Pedido confirmado, download pronto
 * 
 * SEGURANÇA: Apenas admins autorizados recebem notificações
 */

// Lista de emails de admins autorizados a receber notificações
const AUTHORIZED_ADMIN_EMAILS = [
  'arafacriou@gmail.com',
  'edduardooo2011@gmail.com',
];

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, unknown>;
}

/**
 * Envia notificação via OneSignal para TODOS os usuários inscritos
 */
export async function sendWebPush(payload: WebPushPayload): Promise<void> {
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    console.warn('⚠️ OneSignal não configurado - Web Push não enviado');
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        headings: { en: payload.title },
        contents: { en: payload.body },
        url: payload.url || process.env.NEXT_PUBLIC_BASE_URL,
        chrome_web_icon: payload.icon || '/icon-192x192.png',
        data: payload.data,
        included_segments: ['Subscribed Users'], // Todos inscritos
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro OneSignal:', error);
      throw new Error(error.errors?.[0] || 'Erro ao enviar Web Push');
    }

    const data = await response.json();
    console.log('✅ Web Push enviado:', data.id);
  } catch (error) {
    console.error('❌ Erro ao enviar Web Push:', error);
    throw error;
  }
}

/**
 * Envia notificação APENAS para ADMINs
 * Usado para: vendas, novos pedidos, pagamentos
 *
 * IMPORTANTE: Admins devem ter tag "role:admin" no OneSignal
 */
export async function sendWebPushToAdmins(payload: WebPushPayload): Promise<void> {
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    console.warn('⚠️ OneSignal não configurado - Web Push não enviado');
    console.warn('ONESIGNAL_APP_ID:', process.env.ONESIGNAL_APP_ID ? 'Configurado' : 'Faltando');
    console.warn(
      'ONESIGNAL_REST_API_KEY:',
      process.env.ONESIGNAL_REST_API_KEY ? 'Configurado' : 'Faltando'
    );
    return;
  }

  try {
    console.log('🔔 Enviando Web Push para admins');
    console.log('📋 Admins autorizados:', AUTHORIZED_ADMIN_EMAILS);

    // Primeiro, buscar todos os player IDs com tag admin
    console.log('📡 Buscando player IDs com tag admin...');
    const playersResponse = await fetch(
      `https://onesignal.com/api/v1/players?app_id=${process.env.ONESIGNAL_APP_ID}&limit=100`,
      {
        headers: {
          Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        },
      }
    );

    if (!playersResponse.ok) {
      throw new Error('Erro ao buscar players OneSignal');
    }

    const playersData = await playersResponse.json();
    
    // Filtrar apenas admins com tag role:admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminPlayers = playersData.players?.filter((p: any) => 
      p.tags?.role === 'admin' && 
      p.invalid_identifier !== true
    ) || [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminPlayerIds = adminPlayers.map((p: any) => p.id);

    console.log(`📋 Encontrados ${adminPlayerIds.length} admin(s) ativos com tag role:admin`);

    if (adminPlayerIds.length === 0) {
      console.warn('⚠️ Nenhum admin encontrado para enviar Web Push');
      console.warn('💡 Certifique-se de que os admins:');
      console.warn('   1. Estão logados no site');
      console.warn('   2. Permitiram notificações no navegador');
      console.warn('   3. Têm role=admin no sistema');
      return;
    }

    const requestBody = {
      app_id: process.env.ONESIGNAL_APP_ID,
      headings: { en: payload.title },
      contents: { en: payload.body },
      url: payload.url || `${process.env.NEXT_PUBLIC_BASE_URL}/admin`,
      chrome_web_icon: payload.icon || '/icon-192x192.png',
      data: {
        ...payload.data,
        isAdminNotification: true,
      },
      // Enviar diretamente para player IDs (apenas Web Push)
      include_player_ids: adminPlayerIds,
    };

    console.log(
      '📤 Request OneSignal:',
      JSON.stringify(
        { ...requestBody, include_player_ids: `[${adminPlayerIds.length} IDs]` },
        null,
        2
      )
    );

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('📥 Response OneSignal:', responseText);

    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        error = { message: responseText };
      }
      console.error('❌ Erro OneSignal:', error);
      throw new Error(error.errors?.[0] || error.message || 'Erro ao enviar Web Push');
    }

    const data = JSON.parse(responseText);
    console.log('✅ Web Push enviado para admins:', data.id);
    console.log('📊 Recipients:', data.recipients || 0);

    if (data.recipients === 0) {
      console.warn('⚠️ ATENÇÃO: 0 recipients! Possíveis causas:');
      console.warn('   1. Admins não têm permissão de notificação no navegador');
      console.warn('   2. Player IDs inválidos ou expirados');
    }
  } catch (error) {
    console.error('❌ Erro ao enviar Web Push para admins:', error);
    throw error;
  }
}

/**
 * Envia notificação para usuário específico
 * Usado para: confirmação de pedido, download pronto
 *
 * @param userId - ID do usuário (external_id no OneSignal)
 */
export async function sendWebPushToUser(userId: string, payload: WebPushPayload): Promise<void> {
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    console.warn('⚠️ OneSignal não configurado');
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        headings: { en: payload.title },
        contents: { en: payload.body },
        url: payload.url || process.env.NEXT_PUBLIC_BASE_URL,
        chrome_web_icon: payload.icon || '/icon-192x192.png',
        data: payload.data,
        // Enviar para usuário específico usando external_id
        include_external_user_ids: [userId],
        // ✅ Especificar que é apenas Web Push
        channel_for_external_user_ids: 'push',
        // channel_for_external_user_ids: 'push', // ❌ Incompatível
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro OneSignal:', error);
      throw new Error(error.errors?.[0] || 'Erro ao enviar Web Push');
    }

    const data = await response.json();
    console.log('✅ Web Push enviado para usuário:', data.id);
  } catch (error) {
    console.error('❌ Erro ao enviar Web Push:', error);
    throw error;
  }
}

/**
 * CONFIGURAÇÃO ONESIGNAL:
 *
 * 1. Criar conta: https://onesignal.com/
 * 2. Criar novo app Web Push
 * 3. Obter App ID e REST API Key
 * 4. Adicionar no .env:
 *
 * ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
 * ONESIGNAL_REST_API_KEY=seu_rest_api_key
 *
 * Documentação: https://documentation.onesignal.com/docs/web-push-quickstart
 */
