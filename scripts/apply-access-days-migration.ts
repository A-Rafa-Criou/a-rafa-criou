import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  console.log('\n🚀 Aplicando migration de access_days...\n');

  try {
    // Ler o arquivo SQL
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'apply-access-days-migration.sql'),
      'utf-8'
    );

    // Executar o SQL
    await db.execute(sql.raw(sqlFile));

    console.log('\n✅ Migration aplicada com sucesso!\n');

    // Verificar se foi aplicado corretamente
    const result = await db.execute(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('site_settings', 'orders') 
        AND column_name = 'access_days'
      ORDER BY table_name;
    `);

    console.log('📋 Colunas criadas:');
    console.table(result);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao aplicar migration:', error);
    process.exit(1);
  }
}

applyMigration();
