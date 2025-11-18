/**
 * Script para CORRIGIR manualmente traduções específicas problema
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { products, productI18n } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSlug } from '../src/lib/deepl';

config({ path: resolve(process.cwd(), '.env.local') });

// Mapeamento manual de traduções corretas
const MANUAL_FIXES: Record<string, string> = {
  'LEMBRANCINHA PARA SEMANA DA VISITA': 'RECUERDITO PARA SEMANA DE LA VISITA',
  'LEMBRANCINHA PARA OS IRMÃOS DO MICROFONE VOLANTE':
    'RECUERDITO PARA LOS HERMANOS DEL MICRÓFONO VOLANTE',
  'PLAQUINHAS ESCOLA DE PIONEIROS': 'PLAQUITAS ESCUELA DE PRECURSORES',
  'PAPÉIS DE CARTA – COLEÇÃO: OBSERVANDO A CRIAÇÃO':
    'PAPELES DE CARTA – COLECCIÓN: OBSERVANDO LA CREACIÓN',
  'PAPÉIS PARA CARTAS – COLEÇÃO: FRUTINHAS': 'PAPELES PARA CARTAS – COLECCIÓN: FRUTINHAS',
};

async function main() {
  console.log('🔧 Aplicando correções manuais...\n');

  for (const [ptName, esName] of Object.entries(MANUAL_FIXES)) {
    const [product] = await db.select().from(products).where(eq(products.name, ptName)).limit(1);

    if (product) {
      const slug = generateSlug(esName);

      await db
        .update(productI18n)
        .set({
          name: esName,
          slug,
          updatedAt: new Date(),
        })
        .where(and(eq(productI18n.productId, product.id), eq(productI18n.locale, 'es')));

      console.log(`✅ ${ptName}`);
      console.log(`   → ${esName}\n`);
    }
  }

  console.log('✅ Concluído!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
