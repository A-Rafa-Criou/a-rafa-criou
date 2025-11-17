/**
 * Script para listar traduções ES atuais
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { productI18n } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const translations = await db.select().from(productI18n).where(eq(productI18n.locale, 'es'));

  console.log('📋 Traduções ES atuais:\n');
  translations.forEach(t => {
    console.log(`- ${t.name}`);
  });

  process.exit(0);
}

main().catch(console.error);
