/**
 * Script de teste OneSignal
 *
 * Testa:
 * - Credenciais (App ID e REST API Key)
 * - Envio de notificação de teste
 * - Listagem de usuários inscritos
 * - Tags aplicadas
 */

import 'dotenv/config';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

async function testOneSignal() {
  console.log('🔔 Teste OneSignal\n');

  // 1. Verificar credenciais
  console.log('1️⃣ Verificando credenciais:');
  console.log('   App ID:', ONESIGNAL_APP_ID ? '✅ Configurado' : '❌ Faltando');
  console.log('   REST API Key:', ONESIGNAL_REST_API_KEY ? '✅ Configurado' : '❌ Faltando');

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error('❌ Credenciais OneSignal faltando');
    process.exit(1);
  }

  console.log('');

  // 2. Listar usuários inscritos
  console.log('2️⃣ Buscando usuários inscritos...');
  try {
    const usersResponse = await fetch(
      `https://onesignal.com/api/v1/players?app_id=${ONESIGNAL_APP_ID}&limit=100`,
      {
        headers: {
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
      }
    );

    if (!usersResponse.ok) {
      const errorText = await usersResponse.text();
      console.error('❌ Erro ao buscar usuários:', errorText);
    } else {
      const usersData = await usersResponse.json();
      console.log('✅ Total de usuários:', usersData.total_count);

      if (usersData.players && usersData.players.length > 0) {
        console.log('\n📋 Usuários:');
        usersData.players.forEach((player: any, index: number) => {
          console.log(`\n   Usuário ${index + 1}:`);
          console.log('   - ID:', player.id);
          console.log('   - External ID:', player.external_user_id || 'Não definido');
          console.log('   - Tags:', JSON.stringify(player.tags || {}));
          console.log(
            '   - Último login:',
            new Date(player.last_active * 1000).toLocaleString('pt-BR')
          );
          console.log('   - Sessões:', player.session_count);
        });
      } else {
        console.log('⚠️ Nenhum usuário inscrito');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
  }

  console.log('\n');

  // 3. Enviar notificação de teste para admins
  console.log('3️⃣ Enviando notificação de teste para admins...');
  try {
    const notificationBody = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: '🧪 Teste Web Push Admin' },
      contents: {
        en: 'Notificação de teste do sistema. Se você receber isso, o Web Push está funcionando!',
      },
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin`,
      chrome_web_icon: '/icon-192x192.png',
      filters: [
        {
          field: 'tag',
          key: 'role',
          relation: '=',
          value: 'admin',
        },
      ],
    };

    console.log('📤 Request:', JSON.stringify(notificationBody, null, 2));

    const notificationResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationBody),
    });

    const responseText = await notificationResponse.text();

    if (!notificationResponse.ok) {
      console.error('❌ Erro ao enviar notificação:', responseText);
      try {
        const error = JSON.parse(responseText);
        console.error('Detalhes:', JSON.stringify(error, null, 2));
      } catch {
        // Ignore JSON parse error
      }
    } else {
      const notificationData = JSON.parse(responseText);
      console.log('✅ Notificação enviada:', notificationData.id);
      console.log('📊 Recipients:', notificationData.recipients || 0);

      if (notificationData.recipients === 0) {
        console.log(
          '\n⚠️ ATENÇÃO: 0 recipients significa que nenhum admin com tag "role:admin" foi encontrado!'
        );
        console.log('   Verifique:');
        console.log('   1. Admin fez login no /admin?');
        console.log('   2. Admin permitiu notificações no navegador?');
        console.log('   3. Tag "role:admin" foi aplicada? (veja logs do navegador)');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error);
  }

  console.log('\n✅ Teste concluído!\n');
}

testOneSignal();
