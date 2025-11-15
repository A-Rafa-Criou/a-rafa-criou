/**
 * Script para adicionar coluna file_type manualmente
 * Ignora outros problemas de schema e adiciona apenas a coluna necessária
 */

import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function addFileTypeColumn() {
  console.log('🔄 Adicionando coluna file_type...\n');

  try {
    // Verificar se a coluna já existe
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name = 'file_type'
    `);

    if (checkColumn.length > 0) {
      console.log('✅ Coluna file_type já existe!');
      return;
    }

    // Adicionar coluna
    console.log('➕ Adicionando coluna file_type...');
    await db.execute(sql`
      ALTER TABLE products 
      ADD COLUMN file_type VARCHAR(50) DEFAULT 'pdf' NOT NULL
    `);

    console.log('✅ Coluna file_type adicionada com sucesso!');
    console.log('\n📊 Verificando dados...');
    
    // Verificar quantos produtos foram atualizados
    const products = await db.execute(sql`
      SELECT COUNT(*) as total, file_type 
      FROM products 
      GROUP BY file_type
    `);

    console.log('📦 Produtos por tipo de arquivo:');
    products.forEach((row: any) => {
      console.log(`   • ${row.file_type}: ${row.total} produtos`);
    });

    console.log('\n🎉 Migration concluída com sucesso!\n');

  } catch (error: any) {
    if (error.code === '42701') {
      console.log('✅ Coluna file_type já existe!');
      return;
    }
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

addFileTypeColumn().then(() => {
  process.exit(0);
});
