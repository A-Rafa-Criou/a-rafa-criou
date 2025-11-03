import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db/index';
import { sql } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

async function checkTranslations() {
  console.log('🔍 Verificando traduções do produto "a-melhor-vida-de-todas"...\n');

  const result = await db.execute(sql`
    SELECT pi.locale, pi.name, LEFT(pi.description, 100) as description_preview
    FROM product_i18n pi
    JOIN products p ON p.id = pi.product_id
    WHERE p.slug = 'a-melhor-vida-de-todas'
    ORDER BY pi.locale
  `);

  console.log('Traduções encontradas:');
  console.log(result);

  // Verificar se description está NULL
  const fullDesc = await db.execute(sql`
    SELECT pi.locale, pi.description IS NULL as desc_is_null, LENGTH(pi.description) as desc_length
    FROM product_i18n pi
    JOIN products p ON p.id = pi.product_id
    WHERE p.slug = 'a-melhor-vida-de-todas'
    ORDER BY pi.locale
  `);

  console.log('\nStatus das descrições:');
  console.log(fullDesc);

  process.exit(0);
}

checkTranslations().catch(console.error);
