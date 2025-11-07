/**
 * Script para limpar categorias do banco
 * Mantém apenas: Carta, Diversos, Lembrancinhas
 * Remove todas as outras categorias
 */

import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { notInArray } from 'drizzle-orm';

async function cleanCategories() {
  console.log('🔍 Buscando categorias no banco...\n');

  // Buscar todas as categorias
  const allCategories = await db.select().from(categories);

  console.log('📊 Categorias encontradas:');
  allCategories.forEach(cat => {
    console.log(`  - ${cat.name} (ID: ${cat.id}, Parent: ${cat.parentId || 'null'})`);
  });

  // Categorias que devem ser mantidas
  const keepCategories = ['Carta', 'Diversos', 'Lembrancinhas'];

  console.log('\n✅ Categorias que serão mantidas:', keepCategories.join(', '));

  // Encontrar IDs das categorias a serem mantidas
  const categoriesToKeep = allCategories.filter(cat => keepCategories.includes(cat.name));

  const idsToKeep = categoriesToKeep.map(cat => cat.id);

  console.log('\n🔑 IDs a manter:', idsToKeep);

  if (idsToKeep.length === 0) {
    console.error('❌ Erro: Nenhuma categoria encontrada para manter!');
    process.exit(1);
  }

  // Categorias a serem removidas
  const categoriesToDelete = allCategories.filter(cat => !idsToKeep.includes(cat.id));

  if (categoriesToDelete.length === 0) {
    console.log('\n✅ Nenhuma categoria para remover. Banco já está limpo!');
    process.exit(0);
  }

  console.log('\n🗑️  Categorias que serão REMOVIDAS:');
  categoriesToDelete.forEach(cat => {
    console.log(`  - ${cat.name} (ID: ${cat.id})`);
  });

  console.log('\n⚠️  ATENÇÃO: Esta operação irá deletar', categoriesToDelete.length, 'categorias!');
  console.log('⚠️  Produtos com estas categorias ficarão sem categoria principal!');

  // Confirmar antes de deletar
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n🔄 Removendo categorias...');

  try {
    // Deletar categorias que não estão na lista de manter
    await db.delete(categories).where(notInArray(categories.id, idsToKeep));

    console.log('\n✅ Categorias removidas com sucesso!');
    console.log('\n📋 Resumo:');
    console.log(`  ✅ Mantidas: ${idsToKeep.length} categorias`);
    console.log(`  🗑️  Removidas: ${categoriesToDelete.length} categorias`);

    // Mostrar categorias finais
    console.log('\n📊 Categorias restantes no banco:');
    const finalCategories = await db.select().from(categories);
    finalCategories.forEach(cat => {
      console.log(`  ✓ ${cat.name} (ID: ${cat.id})`);
    });

    console.log('\n✅ Limpeza concluída!');
  } catch (error) {
    console.error('\n❌ Erro ao remover categorias:', error);
    process.exit(1);
  }
}

cleanCategories()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
