import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { db } from '../../src/lib/db';
import { files } from '../../src/lib/db/schema';

const BASE_URL = 'https://arafacriou.com.br/wp-content/uploads/woocommerce_uploads/';
const OUTPUT_DIR = 'C:\\Users\\eddua\\a-rafa-criou\\data\\wordpress-files';

async function downloadPdfsFromWordPress() {
  console.log('📥 BAIXANDO PDFs DO WORDPRESS\n');

  // Buscar todos os arquivos do banco
  const allFiles = await db.select().from(files);

  console.log(`📊 Total de arquivos no banco: ${allFiles.length}\n`);

  if (allFiles.length === 0) {
    console.log('⚠️  Nenhum arquivo encontrado no banco.');
    return;
  }

  let downloaded = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const progress = `[${i + 1}/${allFiles.length}]`;

    try {
      // Montar URL completa
      let fileUrl = file.path;

      // Se for path relativo, adicionar base URL
      if (!fileUrl.startsWith('http')) {
        fileUrl = BASE_URL + fileUrl;
      }

      console.log(`${progress} 📥 Baixando: ${file.name}`);
      console.log(`         URL: ${fileUrl}`);

      // Baixar arquivo
      const response = await fetch(fileUrl);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`${progress} ⚠️  ARQUIVO NÃO ENCONTRADO (404)`);
          skipped++;
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Obter conteúdo como buffer
      const buffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(buffer);

      // Criar path local (preservar estrutura de pastas)
      const relativePath = file.path.replace(
        /^https?:\/\/[^\/]+\/wp-content\/uploads\/woocommerce_uploads\//,
        ''
      );
      const localPath = join(OUTPUT_DIR, relativePath);

      // Criar diretórios se não existirem
      mkdirSync(dirname(localPath), { recursive: true });

      // Salvar arquivo
      writeFileSync(localPath, fileBuffer);

      const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`${progress} ✅ Salvo: ${relativePath} (${sizeMB} MB)\n`);

      downloaded++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`${progress} ❌ ERRO: ${errorMessage}\n`);
      errors++;
    }
  }

  console.log('\n📊 Resumo do Download:');
  console.log(`   ✅ Baixados: ${downloaded}`);
  console.log(`   ⏭️  Pulados (404): ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);

  if (downloaded > 0) {
    console.log(`\n📁 Arquivos salvos em: ${OUTPUT_DIR}`);
    console.log('\n✅ Pronto! Agora execute:');
    console.log('   npx tsx scripts/migration/upload-pdfs-to-r2.ts');
  }
}

downloadPdfsFromWordPress().catch(console.error);
