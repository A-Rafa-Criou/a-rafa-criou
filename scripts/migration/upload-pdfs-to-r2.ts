import 'dotenv/config';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { db } from '../../src/lib/db';
import { files } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';

// Configuração do cliente R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET!;
const LOCAL_FILES_PATH = 'C:\\Users\\eddua\\a-rafa-criou\\data\\wordpress-files';

interface FileToUpload {
  localPath: string;
  fileName: string;
  r2Key: string;
  size: number;
}

async function uploadPdfsToR2() {
  console.log('📦 MIGRAÇÃO DE PDFs PARA CLOUDFLARE R2\n');
  console.log(`📁 Pasta local: ${LOCAL_FILES_PATH}`);
  console.log(`🪣 Bucket R2: ${BUCKET_NAME}\n`);

  // 1. Escanear arquivos locais
  console.log('🔍 Escaneando arquivos locais...\n');

  if (!existsSync(LOCAL_FILES_PATH)) {
    console.error(`❌ Pasta não encontrada: ${LOCAL_FILES_PATH}`);
    console.log('\n⚠️  ANTES DE CONTINUAR:');
    console.log('1. Baixe os PDFs do WordPress via FTP/SFTP');
    console.log('2. Extraia em: C:\\Users\\eddua\\a-rafa-criou\\data\\wordpress-files\\');
    console.log('3. Execute este script novamente');
    return;
  }

  const filesToUpload: FileToUpload[] = [];

  function scanDirectory(dir: string) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        scanDirectory(fullPath);
      } else if (extname(entry).toLowerCase() === '.pdf') {
        const relativePath = fullPath
          .replace(LOCAL_FILES_PATH, '')
          .replace(/\\/g, '/')
          .substring(1);
        filesToUpload.push({
          localPath: fullPath,
          fileName: entry,
          r2Key: `pdfs/${relativePath}`,
          size: stats.size,
        });
      }
    }
  }

  scanDirectory(LOCAL_FILES_PATH);

  const totalSize = filesToUpload.reduce((sum, f) => sum + f.size, 0);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

  console.log(`📊 Arquivos encontrados: ${filesToUpload.length}`);
  console.log(`💾 Tamanho total: ${totalSizeMB} MB\n`);

  if (filesToUpload.length === 0) {
    console.log('⚠️  Nenhum arquivo PDF encontrado na pasta.');
    return;
  }

  // 2. Upload para R2
  console.log('☁️  Iniciando upload para Cloudflare R2...\n');

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    const progress = `[${i + 1}/${filesToUpload.length}]`;

    try {
      // Verificar se já existe no R2
      try {
        await r2Client.send(
          new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: file.r2Key,
          })
        );

        console.log(`${progress} ⏭️  ${file.fileName} - JÁ EXISTE`);
        skipped++;
        continue;
      } catch (error: any) {
        if (error.name !== 'NotFound') {
          throw error;
        }
      }

      // Upload do arquivo
      const fileContent = readFileSync(file.localPath);

      await r2Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: file.r2Key,
          Body: fileContent,
          ContentType: 'application/pdf',
          CacheControl: 'public, max-age=31536000', // 1 ano
        })
      );

      console.log(`${progress} ✅ ${file.fileName} - ${(file.size / 1024).toFixed(0)} KB`);
      uploaded++;
    } catch (error) {
      console.error(`${progress} ❌ ${file.fileName} - ERRO:`, error);
      errors++;
    }
  }

  console.log('\n📊 Resumo do Upload:');
  console.log(`   ✅ Enviados: ${uploaded}`);
  console.log(`   ⏭️  Pulados: ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);

  // 3. Atualizar banco de dados
  if (uploaded > 0) {
    console.log('\n🔄 Atualizando paths no banco de dados...\n');

    const allFiles = await db.select().from(files);

    let updated = 0;
    let notFound = 0;

    for (const dbFile of allFiles) {
      // Encontrar arquivo correspondente no R2
      const r2File = filesToUpload.find(
        f => f.localPath.includes(dbFile.path) || dbFile.path.includes(f.fileName)
      );

      if (r2File) {
        await db
          .update(files)
          .set({
            path: r2File.r2Key,
          })
          .where(eq(files.id, dbFile.id));

        console.log(`✅ Atualizado: ${dbFile.name} → ${r2File.r2Key}`);
        updated++;
      } else {
        console.log(`⚠️  Não encontrado no R2: ${dbFile.name} (path: ${dbFile.path})`);
        notFound++;
      }
    }

    console.log('\n📊 Resumo da Atualização:');
    console.log(`   ✅ Atualizados: ${updated}`);
    console.log(`   ⚠️  Não encontrados: ${notFound}`);
  }

  console.log('\n✅ Migração de PDFs concluída!');
  console.log('\n🔗 URLs de acesso serão geradas via signed URLs na API de download.');
}

uploadPdfsToR2().catch(console.error);
