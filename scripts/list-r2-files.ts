import { r2, R2_BUCKET } from '../src/lib/r2';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

async function listAllR2Files() {
  console.log('📦 Listando TODOS os arquivos no bucket:', R2_BUCKET, '\n');

  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      MaxKeys: 1000,
    });

    const response = await r2.send(command);
    const files = response.Contents || [];

    console.log(`📊 Total de arquivos encontrados: ${files.length}\n`);

    if (files.length === 0) {
      console.log('❌ Nenhum arquivo encontrado no bucket!');
      console.log('\n⚠️ AÇÃO NECESSÁRIA: Você precisa fazer upload dos PDFs para o R2.');
      console.log('   Use o painel admin para criar produtos e fazer upload dos arquivos.');
    } else {
      console.log('Arquivos:');
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.Key}`);
        console.log(`   Tamanho: ${(file.Size || 0 / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Modificado: ${file.LastModified}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Erro ao listar arquivos:', error);
  }
}

listAllR2Files().catch(console.error);
