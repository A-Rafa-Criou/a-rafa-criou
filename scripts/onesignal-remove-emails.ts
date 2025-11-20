/**
 * Remove emails de todos os players do OneSignal
 * 
 * Necessário porque OneSignal tenta enviar para múltiplos canais
 * quando players têm email configurado
 */

import 'dotenv/config';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

async function removeEmails() {
  console.log('🧹 Removendo emails do OneSignal\n');

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error('❌ Credenciais faltando');
    process.exit(1);
  }

  // Buscar todos os players
  const playersResponse = await fetch(
    `https://onesignal.com/api/v1/players?app_id=${ONESIGNAL_APP_ID}&limit=100`,
    {
      headers: {
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
    }
  );

  if (!playersResponse.ok) {
    console.error('❌ Erro ao buscar players');
    process.exit(1);
  }

  const playersData = await playersResponse.json();
  const players = playersData.players || [];

  console.log(`📋 Total de players: ${players.length}\n`);

  let removed = 0;
  let skipped = 0;

  for (const player of players) {
    // Verificar se player tem email
    if (!player.external_user_id || player.invalid_identifier) {
      skipped++;
      continue;
    }

    console.log(`🔧 Atualizando player ${player.id}...`);

    // Atualizar player removendo email
    const updateResponse = await fetch(
      `https://onesignal.com/api/v1/players/${player.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          email: '', // Remover email
        }),
      }
    );

    if (updateResponse.ok) {
      console.log(`✅ Email removido do player ${player.id}`);
      removed++;
    } else {
      const error = await updateResponse.text();
      console.error(`❌ Erro ao atualizar player ${player.id}:`, error);
    }

    // Delay para não sobrecarregar API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Finalizado!`);
  console.log(`   - Emails removidos: ${removed}`);
  console.log(`   - Pulados: ${skipped}`);
}

removeEmails();
