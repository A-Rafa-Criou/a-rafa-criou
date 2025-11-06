import 'dotenv/config';
import { db } from '../src/lib/db';
import { files } from '../src/lib/db/schema';

async function clearFilesTable() {
  console.log('🗑️  Limpando tabela files...\n');

  const deleted = await db.delete(files);

  console.log(`✅ Tabela files limpa!`);
  console.log(`   Registros removidos: ${deleted.count || 'todos'}\n`);
}

clearFilesTable()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
