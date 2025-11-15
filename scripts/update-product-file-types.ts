/**
 * Script para atualizar produtos existentes com fileType = 'pdf'
 * Garante que todos os produtos tenham o campo preenchido
 */

import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function updateProductFileTypes() {
  console.log('🔄 Atualizando produtos com fileType...\n');

  try {
    // Atualizar todos os produtos que não têm fileType definido
    const result = await db.execute(sql`
      UPDATE products 
      SET file_type = 'pdf' 
      WHERE file_type IS NULL OR file_type = ''
    `);

    console.log(`✅ Produtos atualizados: ${result.length || 0}`);

    // Verificar status atual
    const stats = await db.execute(sql`
      SELECT file_type, COUNT(*) as total 
      FROM products 
      GROUP BY file_type
    `);

    console.log('\n📊 Produtos por tipo de arquivo:');
    stats.forEach((row: any) => {
      console.log(`   • ${row.file_type || 'NULL'}: ${row.total} produtos`);
    });

    console.log('\n✅ Atualização concluída!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

updateProductFileTypes().then(() => {
  process.exit(0);
});
