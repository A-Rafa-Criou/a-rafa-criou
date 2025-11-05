import { db } from '../src/lib/db/index.js';
import { users } from '../src/lib/db/schema.js';
import { eq } from 'drizzle-orm';

async function checkUser() {
  const email = 'edduardooo2011@hotmail.com';
  
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (user.length === 0) {
    console.log('❌ Usuário não encontrado');
    process.exit(1);
  }
  
  console.log('\n📧 Email:', user[0].email);
  console.log('🔐 password:', user[0].password?.substring(0, 30) + '...');
  console.log('   Tamanho:', user[0].password?.length || 0, 'chars');
  console.log('📜 legacyPasswordHash:', user[0].legacyPasswordHash?.substring(0, 30) + '...');
  console.log('   Tamanho:', user[0].legacyPasswordHash?.length || 0, 'chars');
  console.log('🏷️  legacyPasswordType:', user[0].legacyPasswordType);
  console.log();
  
  process.exit(0);
}

checkUser().catch(console.error);
