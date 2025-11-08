/**
 * Script para listar categorias do banco
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega .env.local manualmente
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';

async function listCategories() {
  console.log('📋 Listando categorias...\n');

  try {
    const allCategories = await db.select().from(categories);

    if (allCategories.length === 0) {
      console.log('❌ Nenhuma categoria encontrada no banco de dados!');
      console.log('💡 Crie categorias em /admin/categorias primeiro');
    } else {
      console.log(`✅ ${allCategories.length} categoria(s) encontrada(s):\n`);
      allCategories.forEach(cat => {
        console.log(`  ID: ${cat.id}`);
        console.log(`  Nome: ${cat.name}`);
        console.log(`  Slug: ${cat.slug}`);
        console.log(`  Pai: ${cat.parentId || 'Nenhum (categoria raiz)'}`);
        console.log(`  Ativo: ${cat.isActive ? 'Sim' : 'Não'}`);
        console.log('  ---');
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar categorias:', error);
    process.exit(1);
  }
}

listCategories()
  .then(() => {
    console.log('\n✅ Listagem concluída!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
