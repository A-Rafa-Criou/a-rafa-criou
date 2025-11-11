/**
 * Script para limpar chunks de upload órfãos (mais de 1 hora sem finalização)
 *
 * Execute com: npx tsx scripts/cleanup-orphan-chunks.ts
 *
 * Adicione ao cron job ou Vercel Cron:
 * - Frequência recomendada: a cada 1 hora
 * - Rota: GET /api/cron/cleanup-chunks
 */

import { db } from '../src/lib/db';
import { uploadChunks } from '../src/lib/db/schema';
import { lt } from 'drizzle-orm';

async function cleanupOrphanChunks() {
  console.log('🧹 Iniciando limpeza de chunks órfãos...');

  // Deletar chunks com mais de 1 hora
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const deletedChunks = await db
      .delete(uploadChunks)
      .where(lt(uploadChunks.createdAt, oneHourAgo))
      .returning();

    console.log(`✅ ${deletedChunks.length} chunks órfãos removidos`);
  } catch (error) {
    console.error('❌ Erro ao limpar chunks:', error);
    process.exit(1);
  }
}

// Executar script
cleanupOrphanChunks()
  .then(() => {
    console.log('✅ Limpeza concluída');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
