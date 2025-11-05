import { db } from '../src/lib/db/index.js';
import { users } from '../src/lib/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function testLogin() {
  const email = 'edduardooo2011@hotmail.com';
  const password = '@Nike2011@';

  console.log('\n🔐 TESTANDO LOGIN (sem cache)\n');
  console.log('📧 Email:', email);
  console.log('🔑 Senha:', password);
  console.log();

  const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (user.length === 0) {
    console.log('❌ Usuário não encontrado\n');
    process.exit(1);
  }

  const dbUser = user[0];

  console.log('📊 DADOS DO BANCO:');
  console.log(
    '   password:',
    dbUser.password?.substring(0, 30) + '... (' + dbUser.password?.length + ' chars)'
  );
  console.log(
    '   legacyPasswordHash:',
    dbUser.legacyPasswordHash?.substring(0, 30) +
      '... (' +
      dbUser.legacyPasswordHash?.length +
      ' chars)'
  );
  console.log('   legacyPasswordType:', dbUser.legacyPasswordType);
  console.log();

  // Testar com legacyPasswordHash
  if (dbUser.legacyPasswordHash) {
    console.log('🔄 Testando com legacyPasswordHash...');
    const result = await bcrypt.compare(password, dbUser.legacyPasswordHash);
    console.log('   Resultado:', result ? '✅ CORRETO' : '❌ INCORRETO');
    console.log();
  }

  // Testar com password
  if (dbUser.password) {
    console.log('🔄 Testando com password...');
    const result = await bcrypt.compare(password, dbUser.password);
    console.log('   Resultado:', result ? '✅ CORRETO' : '❌ INCORRETO');
    console.log();
  }

  process.exit(0);
}

testLogin().catch(console.error);
