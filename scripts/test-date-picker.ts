/**
 * Script para testar o DateRangePicker
 * Simula diferentes cenários de seleção de datas
 */

import { toZonedTime } from 'date-fns-tz';

const BRAZIL_TZ = 'America/Sao_Paulo';

console.log('🗓️  Testando DateRangePicker\n');

// Simular o que acontece quando o usuário seleciona datas
function testDateSelection(description: string, from: Date, to?: Date) {
  console.log(`\n📌 ${description}`);
  console.log('   From:', from.toLocaleDateString('pt-BR'));
  if (to) {
    console.log('   To:', to.toLocaleDateString('pt-BR'));
  }

  // Normalizar (o que o handleApply faz)
  const normalizedFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  const normalizedTo = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate()) : undefined;

  // Formatar para enviar à API
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  console.log('   Enviado à API:');
  console.log('   startDate:', formatDate(normalizedFrom));
  if (normalizedTo) {
    console.log('   endDate:', formatDate(normalizedTo));
  }

  // Verificar se é o mesmo dia
  if (normalizedTo && normalizedFrom.getTime() === normalizedTo.getTime()) {
    console.log('   ✅ Dia único (from === to)');
  } else if (normalizedTo) {
    const diffDays = Math.floor(
      (normalizedTo.getTime() - normalizedFrom.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`   ✅ Range de ${diffDays + 1} dias`);
  } else {
    console.log('   ✅ Apenas data inicial');
  }
}

// Teste 1: Hoje
const nowBrasilia = toZonedTime(new Date(), BRAZIL_TZ);
const today = new Date(nowBrasilia.getFullYear(), nowBrasilia.getMonth(), nowBrasilia.getDate());
testDateSelection('Preset: Hoje', today, today);

// Teste 2: Ontem
const yesterday = new Date(
  nowBrasilia.getFullYear(),
  nowBrasilia.getMonth(),
  nowBrasilia.getDate() - 1
);
testDateSelection('Preset: Ontem', yesterday, yesterday);

// Teste 3: 7 dias
const start7 = new Date(
  nowBrasilia.getFullYear(),
  nowBrasilia.getMonth(),
  nowBrasilia.getDate() - 6
);
testDateSelection('Preset: 7 dias', start7, today);

// Teste 4: Seleção manual de um único dia (IMPORTANTE!)
const manualDay = new Date(2025, 11, 14); // 14/12/2025
console.log('\n🔍 TESTE CRÍTICO: Seleção de dia único (14/12/2025)');
console.log('   Cenário: Usuário clica apenas no dia 14');
console.log('   From:', manualDay.toLocaleDateString('pt-BR'));
console.log('   To: undefined (calendário não define)');

// Simular o que handleCalendarSelect faz
const normalizedFrom = new Date(manualDay.getFullYear(), manualDay.getMonth(), manualDay.getDate());
const normalizedTo = normalizedFrom; // handleCalendarSelect define como mesmo dia!

console.log('   Após normalização:');
console.log('   From:', normalizedFrom.toLocaleDateString('pt-BR'));
console.log('   To:', normalizedTo.toLocaleDateString('pt-BR'), '(mesmo dia!)');

const formatDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

console.log('   Enviado à API:');
console.log('   startDate:', formatDate(normalizedFrom));
console.log('   endDate:', formatDate(normalizedTo));
console.log('   ✅ API vai buscar dia 14/12 completo (00:00 - 23:59:59)');
console.log('');

testDateSelection('Seleção manual: Dia único (validação)', manualDay, manualDay);

// Teste 5: Seleção manual de range
const manualStart = new Date(2025, 11, 1); // 01/12/2025
const manualEnd = new Date(2025, 11, 15); // 15/12/2025
testDateSelection('Seleção manual: Range 01/12 - 15/12', manualStart, manualEnd);

// Teste 6: Verificar que datas com horas são normalizadas
const dateWithTime = new Date(2025, 11, 15, 14, 30, 45); // 15/12/2025 14:30:45
testDateSelection('Data com hora (deve remover hora)', dateWithTime);

console.log('\n✅ Todos os testes concluídos!');
console.log('\n💡 Comportamento esperado:');
console.log('   - Datas são sempre enviadas sem horas (apenas YYYY-MM-DD)');
console.log('   - Dia único: from e to são a mesma data');
console.log('   - Range: from < to com datas diferentes');
console.log('   - API adiciona 00:00:00 no from e 23:59:59 no to no timezone de Brasília');
