/**
 * Script: Testar senha contra hash
 */

import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      resolve(answer);
    });
  });
}

async function testPassword() {
  try {
    const hash = await question('Cole o hash: ');
    const password = await question('Digite a senha para testar: ');

    console.log('\n🔍 Testando...\n');
    console.log(`Hash: ${hash}`);
    console.log(`Senha: ${password}`);
    console.log('');

    const isValid = await bcrypt.compare(password, hash.trim());

    if (isValid) {
      console.log('✅ SENHA CORRETA! O hash bate com a senha.');
    } else {
      console.log('❌ SENHA INCORRETA! O hash NÃO bate com a senha.');
      console.log('\n💡 Possíveis causas:');
      console.log('   1. Senha errada');
      console.log('   2. Hash foi gerado com outra senha');
      console.log('   3. Use "Esqueci minha senha" para resetar');
    }

    rl.close();
  } catch (error) {
    console.error('❌ Erro:', error);
    rl.close();
  }
}

testPassword();
