import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function migrateChunksToBytea() {
  try {
    console.log('🔄 Migrando chunk_data de text (Base64) para bytea...');

    // Tenta converter dados existentes ou apenas altera o tipo
    await db.execute(sql`
      DO $$
      BEGIN
        -- Limpa chunks antigos primeiro (mais de 1 hora)
        DELETE FROM upload_chunks WHERE created_at < NOW() - INTERVAL '1 hour';
        
        -- Altera o tipo da coluna
        ALTER TABLE upload_chunks ALTER COLUMN chunk_data TYPE BYTEA 
          USING CASE 
            WHEN chunk_data IS NOT NULL AND chunk_data != '' 
            THEN decode(chunk_data, 'base64')
            ELSE NULL::BYTEA
          END;
      EXCEPTION
        WHEN OTHERS THEN
          -- Se falhar (ex: tabela vazia), apenas altera o tipo
          ALTER TABLE upload_chunks ALTER COLUMN chunk_data TYPE BYTEA;
      END $$;
    `);

    console.log('✅ Migration concluída! Coluna chunk_data agora é bytea.');
    console.log(
      '📊 Benefícios: ~33% menos espaço em disco + CPU savings (sem Base64 encode/decode)'
    );
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrateChunksToBytea();
