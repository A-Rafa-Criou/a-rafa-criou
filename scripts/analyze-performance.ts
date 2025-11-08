import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function analyzePerformance() {
  console.log('📊 Análise de Performance do Banco de Dados\n');
  console.log('='.repeat(60));

  // 1. Verificar uso dos índices
  console.log('\n📈 USO DOS ÍNDICES:\n');

  try {
    const indexUsage = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as "Scans",
        idx_tup_read as "Linhas Lidas",
        idx_tup_fetch as "Linhas Retornadas"
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 20
    `);

    console.table(indexUsage);
  } catch (error) {
    console.error('❌ Erro ao buscar uso de índices:', error);
  }

  // 2. Tabelas com mais queries
  console.log('\n🔥 TABELAS MAIS ACESSADAS:\n');

  try {
    const tableStats = await db.execute(sql`
      SELECT 
        schemaname,
        relname as "Tabela",
        seq_scan as "Seq Scans",
        seq_tup_read as "Linhas (Seq)",
        idx_scan as "Index Scans",
        idx_tup_fetch as "Linhas (Index)",
        CASE 
          WHEN seq_scan = 0 THEN 100
          ELSE ROUND((idx_scan::numeric / (seq_scan + idx_scan) * 100), 2)
        END as "% Index Usage"
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY seq_scan + idx_scan DESC
      LIMIT 15
    `);

    console.table(tableStats);
  } catch (error) {
    console.error('❌ Erro ao buscar stats de tabelas:', error);
  }

  // 3. Índices não utilizados
  console.log('\n⚠️  ÍNDICES NÃO UTILIZADOS (candidatos para remoção):\n');

  try {
    const unusedIndexes = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as "Scans"
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan = 0
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
    `);

    if (!unusedIndexes || unusedIndexes.length === 0) {
      console.log('✅ Todos os índices estão sendo utilizados!');
    } else {
      console.table(unusedIndexes);
    }
  } catch (error) {
    console.error('❌ Erro ao buscar índices não utilizados:', error);
  }

  // 4. Tamanho das tabelas
  console.log('\n💾 TAMANHO DAS TABELAS:\n');

  try {
    const tableSizes = await db.execute(sql`
      SELECT 
        tablename as "Tabela",
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Tamanho Total",
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as "Tamanho Dados",
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as "Tamanho Índices"
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 15
    `);

    console.table(tableSizes);
  } catch (error) {
    console.error('❌ Erro ao buscar tamanho de tabelas:', error);
  }

  // 5. Queries mais lentas (se disponível)
  console.log('\n🐌 TOP 10 QUERIES MAIS LENTAS:\n');

  try {
    const slowQueries = await db.execute(sql`
      SELECT 
        SUBSTRING(query, 1, 60) as "Query",
        calls as "Chamadas",
        ROUND(mean_exec_time::numeric, 2) as "Tempo Médio (ms)",
        ROUND(max_exec_time::numeric, 2) as "Tempo Máx (ms)"
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat%'
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `);

    console.table(slowQueries);
  } catch (error) {
    console.log('⚠️  pg_stat_statements não está habilitado (não é obrigatório)');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 RECOMENDAÇÕES:\n');
  console.log('1. Índices com idx_scan = 0 podem ser removidos');
  console.log('2. Tabelas com % Index Usage < 50% precisam de mais índices');
  console.log('3. Execute ANALYZE após grandes mudanças nos dados');
  console.log('4. Monitore queries com mean_exec_time > 100ms\n');
}

analyzePerformance()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
