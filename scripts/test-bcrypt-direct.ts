/**
 * Teste direto do bcrypt com o hash específico
 */

import bcrypt from 'bcryptjs';

async function testBcrypt() {
  const password = 'RafaByEla@2025';
  const hash = '$2y$10$H57/Ihh70LOkXRUZJ8pC/OW7mbnSDH9nenhVh2Xur0XetpTqwyuCu';

  console.log('🔐 Testando validação bcrypt direta');
  console.log(`   Senha: ${password}`);
  console.log(`   Hash: ${hash}`);
  console.log();

  try {
    const isValid = await bcrypt.compare(password, hash);
    console.log(`   Resultado: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
    console.log();

    if (!isValid) {
      console.log('⚠️  O hash está corrompido ou a senha está incorreta.');
      console.log();
      console.log('💡 SOLUÇÕES:');
      console.log('   1. Limpar todos os hashes e forçar reset de senha');
      console.log('   2. Verificar se a senha está correta');
      console.log('   3. Verificar se o hash foi copiado corretamente do WordPress');
      console.log();

      // Testar gerando um hash novo
      console.log('🔄 Gerando hash novo com a mesma senha...');
      const newHash = await bcrypt.hash(password, 10);
      console.log(`   Novo hash: ${newHash}`);
      console.log();

      // Validar o hash novo
      const isNewValid = await bcrypt.compare(password, newHash);
      console.log(`   Hash novo válido: ${isNewValid ? '✅ SIM' : '❌ NÃO'}`);
    } else {
      console.log('✅ Hash está OK! O problema é outra coisa.');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testBcrypt()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
