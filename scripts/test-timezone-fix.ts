/**
 * Script para testar se o timezone fix está funcionando corretamente
 * Execute: npx tsx scripts/test-timezone-fix.ts
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const BRAZIL_TZ = 'America/Sao_Paulo';

console.log('🕐 Testando correção de timezone\n');

// 1. Data atual
const now = new Date();
const nowBrasilia = toZonedTime(now, BRAZIL_TZ);

console.log('1️⃣  Data atual:');
console.log('   UTC:', now.toISOString());
console.log('   Brasília:', nowBrasilia.toISOString());
console.log('   Hora Brasília:', nowBrasilia.toLocaleString('pt-BR', { timeZone: BRAZIL_TZ }));
console.log('');

// 2. Início do dia de hoje em Brasília
const todayBrasilia = new Date(
  nowBrasilia.getFullYear(),
  nowBrasilia.getMonth(),
  nowBrasilia.getDate(),
  0,
  0,
  0,
  0
);
const todayUTC = fromZonedTime(todayBrasilia, BRAZIL_TZ);

console.log('2️⃣  Início do dia de hoje (00:00:00 Brasília):');
console.log('   Local:', todayBrasilia.toLocaleString('pt-BR'));
console.log('   UTC:', todayUTC.toISOString());
console.log(
  '   Brasília:',
  toZonedTime(todayUTC, BRAZIL_TZ).toLocaleString('pt-BR', { timeZone: BRAZIL_TZ })
);
console.log('');

// 3. Fim do dia de hoje em Brasília
const endTodayBrasilia = new Date(
  nowBrasilia.getFullYear(),
  nowBrasilia.getMonth(),
  nowBrasilia.getDate(),
  23,
  59,
  59,
  999
);
const endTodayUTC = fromZonedTime(endTodayBrasilia, BRAZIL_TZ);

console.log('3️⃣  Fim do dia de hoje (23:59:59 Brasília):');
console.log('   Local:', endTodayBrasilia.toLocaleString('pt-BR'));
console.log('   UTC:', endTodayUTC.toISOString());
console.log(
  '   Brasília:',
  toZonedTime(endTodayUTC, BRAZIL_TZ).toLocaleString('pt-BR', { timeZone: BRAZIL_TZ })
);
console.log('');

// 4. Simular o que a API recebe
const dateString = '2025-12-15';
console.log('4️⃣  Parseando string de data:', dateString);

// Forma ERRADA (interpreta como UTC)
const wrongDate = new Date(dateString);
console.log('   ❌ Forma errada (UTC):', wrongDate.toISOString());
console.log(
  '   ❌ Em Brasília:',
  toZonedTime(wrongDate, BRAZIL_TZ).toLocaleString('pt-BR', { timeZone: BRAZIL_TZ })
);

// Forma CERTA (interpreta como timezone de Brasília)
const [year, month, day] = dateString.split('-').map(Number);
const correctDate = new Date(year, month - 1, day, 0, 0, 0, 0);
const correctDateUTC = fromZonedTime(correctDate, BRAZIL_TZ);
console.log('   ✅ Forma correta (Brasília):', correctDateUTC.toISOString());
console.log(
  '   ✅ Em Brasília:',
  toZonedTime(correctDateUTC, BRAZIL_TZ).toLocaleString('pt-BR', { timeZone: BRAZIL_TZ })
);
console.log('');

// 5. Verificar se um pedido de hoje seria incluído
console.log('5️⃣  Verificando inclusão de pedidos:');
const orderTime = new Date(); // Pedido feito agora
console.log('   Pedido feito em:', orderTime.toISOString());
console.log('   Início da busca (UTC):', todayUTC.toISOString());
console.log('   Fim da busca (UTC):', endTodayUTC.toISOString());
console.log(
  '   Incluído?',
  orderTime >= todayUTC && orderTime <= endTodayUTC ? '✅ SIM' : '❌ NÃO'
);
console.log('');

console.log('✅ Teste concluído!');
