import 'dotenv/config';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../../src/lib/db';
import { files, products } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const phpUnserialize = require('phpunserialize');

interface DownloadableFileRow {
  product_id: string;
  product_name: string;
  post_type: string;
  parent_product_id: string; // ID do produto pai (para variações)
  downloadable_files_json: string;
}

interface ParsedFile {
  name: string;
  file: string;
}

async function importDownloadableFiles(csvPath: string) {
  console.log('📦 Importando arquivos para download do WordPress...\n');

  // 1. Ler CSV e remover BOM se existir
  let csvContent = readFileSync(csvPath, 'utf-8');
  
  // Remover BOM (Byte Order Mark) se presente
  if (csvContent.charCodeAt(0) === 0xfeff) {
    csvContent = csvContent.substring(1);
  }
  
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // Lidar com BOM automaticamente
  }) as DownloadableFileRow[];

  console.log(`📊 Total de registros no CSV: ${rows.length}\n`);
  
  // Debug: mostrar primeira linha para verificar colunas
  if (rows.length > 0) {
    console.log('🔍 Debug - Primeira linha:');
    console.log(`   product_id: "${rows[0].product_id}"`);
    console.log(`   parent_product_id: "${rows[0].parent_product_id}"`);
    console.log(`   post_type: "${rows[0].post_type}"`);
    console.log('');
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const wpProductId = parseInt(row.product_id);
      const wpParentId = parseInt(row.parent_product_id);
      const isVariation = row.post_type === 'product_variation';

      // Se for variação, usar ID do produto pai
      const searchId = isVariation && wpParentId > 0 ? wpParentId : wpProductId;
      
      if (isNaN(searchId)) {
        console.log(`⏭️  ID inválido (NaN) - linha ignorada - SKIP`);
        skipped++;
        continue;
      }

      // Buscar produto no banco pelo wp_product_id
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.wpProductId, searchId))
        .limit(1);

      if (!product) {
        console.log(`⏭️  Produto WP #${searchId} não encontrado - SKIP`);
        skipped++;
        continue;
      }

      const dbProductId = product.id;

      // 3. Desserializar JSON do PHP
      let parsedFiles: Record<string, ParsedFile> = {};
      
      try {
        parsedFiles = phpUnserialize(row.downloadable_files_json);
      } catch (e) {
        console.log(`❌ Erro ao desserializar JSON do produto WP #${wpProductId}:`, e);
        errors++;
        continue;
      }

      if (!parsedFiles || typeof parsedFiles !== 'object') {
        console.log(`⏭️  Produto WP #${wpProductId} sem arquivos válidos - SKIP`);
        skipped++;
        continue;
      }

      // 4. Processar cada arquivo
      const fileEntries = Object.values(parsedFiles);
      
      for (const fileData of fileEntries) {
        if (!fileData.file || !fileData.name) {
          console.log(`⏭️  Arquivo sem nome/path no produto WP #${wpProductId} - SKIP`);
          continue;
        }

        // Extrair informações do arquivo
        const fileName = fileData.name;
        const fileUrl = fileData.file;
        
        // Tentar extrair path do R2 ou usar URL completa
        let r2Path = fileUrl;
        
        // Se for URL do WordPress, tentar extrair apenas o caminho relativo
        if (fileUrl.includes('/wp-content/uploads/')) {
          const match = fileUrl.match(/\/wp-content\/uploads\/(.+)$/);
          if (match) {
            r2Path = match[1]; // Exemplo: "2024/01/arquivo.pdf"
          }
        } else if (fileUrl.includes('/woocommerce_uploads/')) {
          const match = fileUrl.match(/\/woocommerce_uploads\/(.+)$/);
          if (match) {
            r2Path = match[1];
          }
        }

        // Detectar MIME type baseado na extensão
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const mimeTypeMap: Record<string, string> = {
          pdf: 'application/pdf',
          zip: 'application/zip',
          doc: 'application/msword',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xls: 'application/vnd.ms-excel',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
        };
        const mimeType = mimeTypeMap[ext] || 'application/octet-stream';

        // Verificar se já existe
        const existingFile = await db
          .select({ id: files.id })
          .from(files)
          .where(eq(files.productId, dbProductId))
          .limit(1);

        if (existingFile.length > 0) {
          console.log(`⏭️  Arquivo já existe para produto WP #${wpProductId} - SKIP`);
          skipped++;
          continue;
        }

        // 5. Inserir arquivo
        await db.insert(files).values({
          productId: dbProductId,
          variationId: null,
          name: fileName,
          originalName: fileName,
          mimeType,
          size: 0, // Não temos o tamanho, será atualizado quando fazer upload real
          path: r2Path,
          hash: null,
        });

        console.log(`✅ Arquivo importado: ${fileName} (Produto WP #${wpProductId})`);
        imported++;
      }
    } catch (error) {
      console.error(`❌ Erro ao processar produto WP #${row.product_id}:`, error);
      errors++;
    }
  }

  console.log('\n📊 Resumo da importação:');
  console.log(`   ✅ Arquivos importados: ${imported}`);
  console.log(`   ⏭️  Registros ignorados: ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);
  console.log(`   📦 Total processado: ${rows.length}`);
}

// Executar
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('❌ Uso: npx tsx scripts/migration/import-downloadable-files.ts <caminho-do-csv>');
  console.error('   Exemplo: npx tsx scripts/migration/import-downloadable-files.ts data/test/downloadable-files.csv');
  process.exit(1);
}

importDownloadableFiles(csvPath)
  .then(() => {
    console.log('\n✅ Importação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
